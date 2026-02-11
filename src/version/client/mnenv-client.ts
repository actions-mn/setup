import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { MnenvAllVersions } from '../types/mnenv-types';

/**
 * MnenvClient handles interaction with the mnenv CLI.
 * Responsibilities:
 * - Clone metanorma/versions repository
 * - Install Ruby dependencies (bundle install)
 * - Execute mnenv CLI and capture JSON output
 * - Clean up cloned repository
 *
 * @sealed This class should not be extended.
 */
export class MnenvClient {
  private readonly VERSIONS_REPO = 'https://github.com/metanorma/versions.git';
  private readonly DEFAULT_BRANCH = 'main';
  private readonly CLONE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly EXEC_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
  private repoDir: string | null = null;
  private isInitialized = false;
  private initializationFailed = false;

  /**
   * Initialize the client by cloning the versions repository and installing dependencies.
   * Returns true if initialization succeeded, false otherwise.
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationFailed) {
      core.warning('MnenvClient previously failed initialization, skipping retry');
      return false;
    }

    try {
      const workspace = process.env.GITHUB_WORKSPACE || homedir();
      this.repoDir = path.join(workspace, '.mnenv-versions');

      // Validate prerequisites
      if (!(await this.checkPrerequisites())) {
        this.initializationFailed = true;
        return false;
      }

      await this.cloneRepository();
      await this.installDependencies();
      this.isInitialized = true;

      // Save repo directory path to state for cleanup in post-action
      core.saveState('mnenv-repo-dir', this.repoDir);

      return true;
    } catch (error) {
      this.initializationFailed = true;
      core.warning(`MnenvClient initialization failed: ${error}`);
      return false;
    }
  }

  /**
   * Fetch all platform version data from mnenv CLI.
   * Returns null if mnenv is not available or fails.
   */
  async fetchAllVersions(): Promise<MnenvAllVersions | null> {
    if (!this.isInitialized) {
      core.warning('MnenvClient not initialized, cannot fetch versions');
      return null;
    }

    try {
      core.info('Fetching version data from mnenv CLI...');

      const output = await this.executeMnenv(['list-all', '--format', 'json']);
      if (!output || output.trim().length === 0) {
        core.warning('mnenv CLI returned empty output');
        return null;
      }

      const data = JSON.parse(output) as MnenvAllVersions;

      // Validate data structure
      if (!this.validateMnenvData(data)) {
        core.warning('mnenv CLI returned invalid data structure');
        return null;
      }

      this.logSummary(data);
      return data;
    } catch (error) {
      core.warning(`Failed to fetch versions from mnenv: ${error}`);
      return null;
    }
  }

  /**
   * Clean up cloned repository.
   * This is safe to call even if initialization failed.
   */
  async cleanup(): Promise<void> {
    // Also check state file for repo dir from previous run
    const stateRepoDir = core.getState('mnenv-repo-dir');
    const dirsToClean = new Set<string>();

    if (this.repoDir) {
      dirsToClean.add(this.repoDir);
    }
    if (stateRepoDir) {
      dirsToClean.add(stateRepoDir);
    }

    for (const dir of dirsToClean) {
      if (fs.existsSync(dir)) {
        core.info(`Cleaning up ${dir}...`);
        try {
          await io.rmRF(dir);
          core.info(`Successfully cleaned up ${dir}`);
        } catch (error) {
          core.warning(`Failed to cleanup ${dir}: ${error}`);
        }
      }
    }

    // Clear state
    core.saveState('mnenv-repo-dir', '');
  }

  /**
   * Check if all prerequisites are available (git, bundle, ruby)
   */
  private async checkPrerequisites(): Promise<boolean> {
    const commands = ['git', 'bundle', 'ruby'];

    for (const cmd of commands) {
      const exitCode = await exec.exec(cmd, ['--version'], {
        silent: true,
        ignoreReturnCode: true
      });
      if (exitCode !== 0) {
        core.warning(`Prerequisite check failed: ${cmd} is not available`);
        return false;
      }
    }

    return true;
  }

  private async cloneRepository(): Promise<void> {
    if (!this.repoDir) {
      throw new Error('Repository directory not set');
    }

    // Remove existing directory if present
    if (fs.existsSync(this.repoDir)) {
      core.debug(`Removing existing directory: ${this.repoDir}`);
      await io.rmRF(this.repoDir);
    }

    core.info(`Cloning metanorma/versions to ${this.repoDir}...`);

    const cloneArgs = [
      'clone',
      '--depth=1',
      `--branch=${this.DEFAULT_BRANCH}`,
      this.VERSIONS_REPO,
      this.repoDir
    ];

    const exitCode = await exec.exec('git', cloneArgs);
    if (exitCode !== 0) {
      throw new Error(`git clone failed with exit code ${exitCode}`);
    }

    core.info('Repository cloned successfully');
  }

  private async installDependencies(): Promise<void> {
    if (!this.repoDir) {
      throw new Error('Repository directory not set');
    }

    core.info('Installing Ruby dependencies...');

    const options = { cwd: this.repoDir };
    const exitCode = await exec.exec('bundle', ['install'], options);

    if (exitCode !== 0) {
      throw new Error(`bundle install failed with exit code ${exitCode}`);
    }

    core.info('Dependencies installed');
  }

  private async executeMnenv(args: string[]): Promise<string> {
    if (!this.repoDir) {
      throw new Error('Repository directory not set');
    }

    let output = '';
    let error = '';

    const options = {
      cwd: this.repoDir,
      silent: true,
      listeners: {
        stdout: (data: Buffer) => { output += data.toString(); },
        stderr: (data: Buffer) => { error += data.toString(); }
      }
    };

    const exitCode = await exec.exec('bundle', ['exec', 'mnenv', ...args], options);

    if (exitCode !== 0) {
      throw new Error(`mnenv failed with exit code ${exitCode}: ${error}`);
    }

    return output;
  }

  /**
   * Validate the structure of mnenv data
   */
  private validateMnenvData(data: any): data is MnenvAllVersions {
    return (
      data &&
      typeof data === 'object' &&
      data.gemfile &&
      typeof data.gemfile.count === 'number' &&
      typeof data.gemfile.latest === 'string' &&
      Array.isArray(data.gemfile.versions) &&
      data.snap &&
      typeof data.snap.count === 'number' &&
      typeof data.snap.latest === 'string' &&
      Array.isArray(data.snap.versions) &&
      data.homebrew &&
      typeof data.homebrew.count === 'number' &&
      typeof data.homebrew.latest === 'string' &&
      Array.isArray(data.homebrew.versions) &&
      data.chocolatey &&
      typeof data.chocolatey.count === 'number' &&
      typeof data.chocolatey.latest === 'string' &&
      Array.isArray(data.chocolatey.versions)
    );
  }

  private logSummary(data: MnenvAllVersions): void {
    core.info('Version data loaded:');
    core.info(`  Gemfile: ${data.gemfile.count} versions (latest: ${data.gemfile.latest})`);
    core.info(`  Snap: ${data.snap.count} versions (latest: ${data.snap.latest})`);
    core.info(`  Homebrew: ${data.homebrew.count} versions (latest: ${data.homebrew.latest})`);
    core.info(`  Chocolatey: ${data.chocolatey.count} versions (latest: ${data.chocolatey.latest})`);
  }
}
