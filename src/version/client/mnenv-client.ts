import {warning, info, debug, saveState, getState} from '@actions/core';
import {exec} from '@actions/exec';
import {rmRF} from '@actions/io';
import {existsSync} from 'fs';
import {join} from 'path';
import {homedir} from 'os';
import type {MnenvAllVersions} from '../types/mnenv-types.js';

/**
 * MnenvClient handles interaction with the mnenv CLI.
 *
 * IMPORTANT: This client uses RUNNER_TEMP for all temporary files to avoid polluting
 * the user's repository. RUNNER_TEMP is automatically cleaned up by GitHub Actions
 * after the job completes, ensuring our action leaves no trace in the user's repo.
 *
 * Responsibilities:
 * - Clone metanorma/versions repository to RUNNER_TEMP
 * - Install Ruby in RUNNER_TEMP if not available (isolated from user environment)
 * - Install Ruby dependencies (bundle install) in isolated temp directory
 * - Execute mnenv CLI and capture JSON output
 * - Clean up cloned repository (also called via main/post lifecycle)
 *
 * @sealed This class should not be extended.
 */
export class MnenvClient {
  private readonly VERSIONS_REPO = 'https://github.com/metanorma/versions.git';
  private readonly DEFAULT_BRANCH = 'main';
  private readonly CLONE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly EXEC_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
  private repoDir: string | null = null;
  private rubyDir: string | null = null;
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
      warning('MnenvClient previously failed initialization, skipping retry');
      return false;
    }

    try {
      // Use RUNNER_TEMP for temporary files to avoid polluting user's repository
      // RUNNER_TEMP is automatically cleaned up by GitHub Actions after the job completes
      const tempDir = process.env.RUNNER_TEMP || homedir();
      this.repoDir = join(tempDir, '.mnenv-versions');

      await this.cloneRepository();
      await this.installDependencies();
      this.isInitialized = true;

      // Save repo directory path to state for cleanup in post-action
      saveState('mnenv-repo-dir', this.repoDir);

      return true;
    } catch (error) {
      this.initializationFailed = true;
      warning(`MnenvClient initialization failed: ${error}`);
      return false;
    }
  }

  /**
   * Fetch all platform version data from mnenv CLI.
   * Returns null if mnenv is not available or fails.
   */
  async fetchAllVersions(): Promise<MnenvAllVersions | null> {
    if (!this.isInitialized) {
      warning('MnenvClient not initialized, cannot fetch versions');
      return null;
    }

    try {
      info('Fetching version data from mnenv CLI...');

      const output = await this.executeMnenv(['list-all', '--format', 'json']);
      if (!output || output.trim().length === 0) {
        warning('mnenv CLI returned empty output');
        return null;
      }

      const data = JSON.parse(output) as MnenvAllVersions;

      // Validate data structure
      if (!this.validateMnenvData(data)) {
        warning('mnenv CLI returned invalid data structure');
        return null;
      }

      this.logSummary(data);
      return data;
    } catch (error) {
      warning(`Failed to fetch versions from mnenv: ${error}`);
      return null;
    }
  }

  /**
   * Clean up cloned repository.
   * This is safe to call even if initialization failed.
   */
  async cleanup(): Promise<void> {
    // Also check state file for repo dir from previous run
    const stateRepoDir = getState('mnenv-repo-dir');
    const dirsToClean = new Set<string>();

    if (this.repoDir) {
      dirsToClean.add(this.repoDir);
    }
    if (stateRepoDir) {
      dirsToClean.add(stateRepoDir);
    }

    for (const dir of dirsToClean) {
      if (existsSync(dir)) {
        info(`Cleaning up ${dir}...`);
        try {
          await rmRF(dir);
          info(`Successfully cleaned up ${dir}`);
        } catch (error) {
          warning(`Failed to cleanup ${dir}: ${error}`);
        }
      }
    }

    // Clear state
    saveState('mnenv-repo-dir', '');
  }

  /**
   * Check if all prerequisites are available (git, bundle, ruby)
   */
  private async checkPrerequisites(): Promise<boolean> {
    const commands = ['git', 'bundle', 'ruby'];

    for (const cmd of commands) {
      const exitCode = await exec(cmd, ['--version'], {
        silent: true,
        ignoreReturnCode: true
      });
      if (exitCode !== 0) {
        warning(`Prerequisite check failed: ${cmd} is not available`);
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
    if (existsSync(this.repoDir)) {
      debug(`Removing existing directory: ${this.repoDir}`);
      await rmRF(this.repoDir);
    }

    info(`Cloning metanorma/versions to ${this.repoDir}...`);

    const cloneArgs = [
      'clone',
      '--depth=1',
      `--branch=${this.DEFAULT_BRANCH}`,
      this.VERSIONS_REPO,
      this.repoDir
    ];

    const exitCode = await exec('git', cloneArgs);
    if (exitCode !== 0) {
      throw new Error(`git clone failed with exit code ${exitCode}`);
    }

    info('Repository cloned successfully');
  }

  private async installDependencies(): Promise<void> {
    if (!this.repoDir) {
      throw new Error('Repository directory not set');
    }

    info('Installing Ruby dependencies...');

    const options = {cwd: this.repoDir};
    const exitCode = await exec('bundle', ['install'], options);

    if (exitCode !== 0) {
      throw new Error(`bundle install failed with exit code ${exitCode}`);
    }

    info('Dependencies installed');
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
        stdout: (data: Buffer) => {
          output += data.toString();
        },
        stderr: (data: Buffer) => {
          error += data.toString();
        }
      }
    };

    const exitCode = await exec(
      'bundle',
      ['exec', 'ruby', 'exe/mnenv', ...args],
      options
    );

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
    info('Version data loaded:');
    info(
      `  Gemfile: ${data.gemfile.count} versions (latest: ${data.gemfile.latest})`
    );
    info(`  Snap: ${data.snap.count} versions (latest: ${data.snap.latest})`);
    info(
      `  Homebrew: ${data.homebrew.count} versions (latest: ${data.homebrew.latest})`
    );
    info(
      `  Chocolatey: ${data.chocolatey.count} versions (latest: ${data.chocolatey.latest})`
    );
  }
}
