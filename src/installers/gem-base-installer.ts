import {IMetanormaSettings} from '../metanorma-settings';
import {BaseInstaller} from './base-installer';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import {GemfileLocksFetcher} from '../gemfile-locks';
import {Terminal} from '../terminal';
import {getVersionStore} from '../version';

/**
 * Abstract base class for gem-based installers
 * Provides common functionality for all gem-based installation methods
 */
export abstract class GemBaseInstaller extends BaseInstaller {
  protected fetcher: GemfileLocksFetcher;
  protected terminal: Terminal;

  constructor() {
    super();
    this.fetcher = new GemfileLocksFetcher();
    this.terminal = new Terminal();
  }

  /**
   * Check if Ruby is installed
   */
  protected async checkRubyInstalled(): Promise<boolean> {
    try {
      let output = '';
      const options = {
        silent: true,
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          }
        }
      };
      const exitCode = await this.execCommand('ruby', ['--version'], options);
      if (exitCode === 0) {
        this.terminal.info(`Ruby detected: ${output.trim()}`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if Bundler is installed
   */
  protected async checkBundlerInstalled(): Promise<boolean> {
    try {
      let output = '';
      const options = {
        silent: true,
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          }
        }
      };
      const exitCode = await this.execCommand('bundle', ['--version'], options);
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Ensure Bundler is installed
   */
  protected async ensureBundler(settings: IMetanormaSettings): Promise<void> {
    if (!(await this.checkBundlerInstalled())) {
      this.terminal.info('Bundler not found, installing...');
      const bundlerVersion = settings.bundlerVersion || '2.6.5';
      await this.execCommand('gem', [
        'install',
        'bundler',
        '-v',
        bundlerVersion
      ]);
    } else {
      this.terminal.info('Bundler already installed');
    }
  }

  /**
   * Check if a file exists
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse semantic version string
   */
  protected parseVersion(
    version: string
  ): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10)
    };
  }

  /**
   * Compare versions: a <= b
   */
  protected versionLessThanOrEqual(
    a: { major: number; minor: number; patch: number },
    b: { major: number; minor: number; patch: number }
  ): boolean {
    if (a.major !== b.major) return a.major < b.major;
    if (a.minor !== b.minor) return a.minor < b.minor;
    return a.patch <= b.patch;
  }

  /**
   * Determine if fontist ~> 2.1 should be added to fix LoadError
   * Versions <= 1.7.1 depend on fontist 2.0.3 which has a LoadError bug
   */
  protected shouldFixFontist(version: string): boolean {
    const parsed = this.parseVersion(version);
    if (!parsed) return false;

    const hasBug = this.versionLessThanOrEqual(parsed, {
      major: 1,
      minor: 7,
      patch: 1
    });

    if (hasBug) {
      this.terminal.info(
        `[Experimental] Detected metanorma-cli ${version} which depends on buggy fontist 2.0.3`
      );
      this.terminal.info(
        `[Experimental] Adding fontist ~> 2.1 to Gemfile to fix LoadError`
      );
    }

    return hasBug;
  }

  /**
   * Setup Gemfile for installation
   * Priority:
   * 1. Custom gemfile path provided → Use as-is, no replacement
   * 2. use-prebuilt-locks: false → Respect existing workspace Gemfile.lock
   * 3. User has workspace Gemfile → Use existing Gemfile
   * 4. User has workspace Gemfile.lock AND version matches → Use existing lock
   * 5. Pre-built lock available from metanorma-gemfile-locks → Use with warning
   * 6. Fallback: Dynamic Gemfile creation + bundle install
   */
  protected async setupGemfile(settings: IMetanormaSettings): Promise<string> {
    // 1. Custom gemfile path → use as-is
    if (settings.gemfile) {
      this.terminal.info(`Using custom Gemfile: ${settings.gemfile}`);
      process.env.BUNDLE_GEMFILE = settings.gemfile;
      return settings.gemfile;
    }

    // Detect workspace directory (GITHUB_WORKSPACE or current working directory)
    const workspaceDir =
      process.env.GITHUB_WORKSPACE || process.cwd();
    const workspaceGemfile = path.join(workspaceDir, 'Gemfile');
    const workspaceLock = path.join(workspaceDir, 'Gemfile.lock');

    // Check for metanorma-docker standard location first
    const dockerGemfile = '/setup/Gemfile';
    if (await this.fileExists(dockerGemfile)) {
      this.terminal.info(
        `Using existing Gemfile from metanorma-docker: ${dockerGemfile}`
      );
      process.env.BUNDLE_GEMFILE = dockerGemfile;
      return dockerGemfile;
    }

    // 2. Check if prebuilt locks are disabled
    if (settings.usePrebuiltLocks === false) {
      this.terminal.info('Pre-built locks disabled, respecting workspace Gemfile.lock');
      return this.setupWorkspaceGemfile(settings, workspaceGemfile, workspaceLock);
    }

    // 3. Check for existing workspace Gemfile (respects user's Gemfile)
    if (await this.fileExists(workspaceGemfile)) {
      this.terminal.info(`Using existing Gemfile from workspace: ${workspaceGemfile}`);
      return workspaceGemfile;
    }

    // 4. Check for existing workspace Gemfile.lock with matching version
    if (await this.fileExists(workspaceLock)) {
      const lockVersion = await this.extractMetanormaVersionFromLock(workspaceLock);
      if (settings.version && lockVersion === settings.version) {
        this.terminal.success(`Using existing Gemfile.lock (matches version ${settings.version})`);
        return workspaceGemfile;
      }
    }

    // 5. Try pre-built lock from metanorma-gemfile-locks
    if (settings.version && settings.version !== 'latest') {
      const isAvailable = await this.fetcher.isVersionAvailable(settings.version);
      if (isAvailable) {
        return await this.usePrebuiltGemfileLock(settings.version, workspaceGemfile, workspaceLock, workspaceDir);
      }
    }

    // 6. Fallback: create Gemfile dynamically
    return this.createDefaultGemfile(settings, workspaceGemfile);
  }

  /**
   * Setup workspace Gemfile (respects existing files)
   */
  private async setupWorkspaceGemfile(
    settings: IMetanormaSettings,
    workspaceGemfile: string,
    workspaceLock: string
  ): Promise<string> {
    // Check workspace Gemfile
    if (await this.fileExists(workspaceGemfile)) {
      this.terminal.info(`Using existing Gemfile from workspace: ${workspaceGemfile}`);
      return workspaceGemfile;
    }

    // No Gemfile exists - create default one in workspace
    return this.createDefaultGemfile(settings, workspaceGemfile);
  }

  /**
   * Use pre-built Gemfile.lock from metanorma-gemfile-locks repository
   */
  private async usePrebuiltGemfileLock(
    version: string,
    workspaceGemfile: string,
    workspaceLock: string,
    workspaceDir: string
  ): Promise<string> {
    this.terminal.info(`Fetching pre-built Gemfile.lock for version ${version}...`);

    const gemfileContent = await this.fetcher.fetchGemfile(version);
    const lockContent = await this.fetcher.fetchGemfileLock(version);

    if (!gemfileContent || !lockContent) {
      this.terminal.warning(`Failed to fetch pre-built files for version ${version}, falling back to dynamic installation`);
      return this.createDefaultGemfile(
        {version} as IMetanormaSettings,
        workspaceGemfile
      );
    }

    const existingLock = await this.fileExists(workspaceLock) ? workspaceLock : null;

    // Write pre-built files
    await fs.promises.writeFile(workspaceGemfile, gemfileContent);
    await fs.promises.writeFile(workspaceLock, lockContent);

    // Warn or info based on whether we replaced an existing lock
    if (existingLock) {
      this.terminal.warnGemfileLockReplacement(
        existingLock,
        `metanorma-gemfile-locks/v${version}/Gemfile.lock`
      );
    } else {
      this.terminal.infoPrebuiltLockUsed(version);
    }

    return workspaceGemfile;
  }

  /**
   * Extract metanorma-cli version from Gemfile.lock
   */
  private async extractMetanormaVersionFromLock(lockPath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(lockPath, 'utf-8');
      // Match patterns like:
      //     metanorma-cli (1.14.3)
      // or
      //     metanorma-cli (1.14.3 abcd123)
      const match = content.match(/    metanorma-cli \((\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Create default Gemfile dynamically
   */
  private async createDefaultGemfile(
    settings: IMetanormaSettings,
    workspaceGemfile: string
  ): Promise<string> {
    let gemfileContent = 'source "https://rubygems.org"\n';

    if (settings.version && settings.version !== 'latest') {
      // [Experimental] Version-specific fontist fix
      // Versions <= 1.7.1 depend on fontist 2.0.3 which has LoadError bug
      const needsFontistFix = this.shouldFixFontist(settings.version);

      if (needsFontistFix) {
        gemfileContent += `gem 'fontist', '~> 2.1'\n`;
      }
      gemfileContent += `gem 'metanorma-cli', '${settings.version}'\n`;
    } else {
      // When using latest, add fontist ~> 2.1 to avoid LoadError with fontist/manifest/install
      // Fontist 2.0.3 has a bug where the manifest/install module cannot be loaded
      gemfileContent += `gem 'fontist', '~> 2.1'\n`;
      gemfileContent += `gem 'metanorma-cli'\n`;
    }

    await fs.promises.writeFile(workspaceGemfile, gemfileContent);
    this.terminal.info(`Created default Gemfile at: ${workspaceGemfile}`);
    return workspaceGemfile;
  }

  /**
   * Update Gemfile with specific version
   * [Experimental] Automatically adds fontist ~> 2.1 for versions <= 1.7.1
   */
  protected async updateGemfileVersion(
    gemfilePath: string,
    version: string
  ): Promise<void> {
    const content = await fs.promises.readFile(gemfilePath, 'utf-8');
    const lines = content.split('\n');

    // [Experimental] Check if we need to add fontist ~> 2.1
    const needsFontistFix = this.shouldFixFontist(version);

    // Find and update the metanorma-cli gem line
    let metanormaUpdated = false;
    let hasFontist = false;
    const newLines = lines.map((line) => {
      if (line.includes("gem 'metanorma-cli'") || line.includes('gem "metanorma-cli"')) {
        metanormaUpdated = true;
        // Preserve the quote style
        const quote = line.includes('"') ? '"' : "'";
        return `gem ${quote}metanorma-cli${quote}, ${quote}${version}${quote}`;
      }
      if (line.includes("gem 'fontist'") || line.includes('gem "fontist"')) {
        hasFontist = true;
      }
      return line;
    });

    // If metanorma-cli not found, add it
    if (!metanormaUpdated) {
      // [Experimental] Add fontist ~> 2.1 before metanorma-cli if needed
      if (needsFontistFix && !hasFontist) {
        newLines.push(`gem 'fontist', '~> 2.1'`);
      }
      newLines.push(`gem 'metanorma-cli', '${version}'`);
    } else if (needsFontistFix && !hasFontist) {
      // [Experimental] Add fontist ~> 2.1 if it doesn't exist
      // Insert before the metanorma-cli line
      const metanormaIndex = newLines.findIndex(
        (line) =>
          line.includes("gem 'metanorma-cli'") ||
          line.includes('gem "metanorma-cli"')
      );
      if (metanormaIndex >= 0) {
        newLines.splice(metanormaIndex, 0, `gem 'fontist', '~> 2.1'`);
      }
    }

    await fs.promises.writeFile(gemfilePath, newLines.join('\n'));
    this.terminal.info(
      `[Experimental] Updated Gemfile at ${gemfilePath} with version ${version}`
    );
  }

  /**
   * Run bundle install (respects Gemfile.lock)
   */
  protected async bundleInstall(): Promise<void> {
    this.terminal.info('Running bundle install (respects Gemfile.lock)');
    const exitCode = await this.execCommand('bundle', ['install']);
    if (exitCode !== 0) {
      throw new Error('bundle install failed');
    }
  }

  /**
   * Run bundle update (updates to latest versions)
   */
  protected async bundleUpdate(): Promise<void> {
    this.terminal.info('Running bundle update (updates Gemfile.lock to latest)');
    const exitCode = await this.execCommand('bundle', ['update']);
    if (exitCode !== 0) {
      throw new Error('bundle update failed');
    }
  }

  /**
   * Update Fontist formulas
   */
  protected async updateFontist(): Promise<void> {
    this.terminal.info('Updating Fontist formulas');
    const exitCode = await this.execCommand('bundle', ['exec', 'fontist', 'update']);
    if (exitCode !== 0) {
      this.terminal.warning('fontist update failed, continuing...');
    }
  }

  /**
   * Verify installation by checking metanorma --version
   */
  protected async verifyInstallation(): Promise<void> {
    this.terminal.info('Verifying Metanorma installation');
    let output = '';
    const options = {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        }
      }
    };
    const exitCode = await this.execCommand(
      'bundle',
      ['exec', 'metanorma', '--version'],
      options
    );
    if (exitCode === 0) {
      this.terminal.success(`Metanorma installed successfully: ${output.trim()}`);
    } else {
      throw new Error('metanorma --version failed');
    }
  }

  /**
   * Install gems based on version setting
   * - version: 'latest' → bundle update
   * - bundle-update: true → bundle update --except metanorma-cli (preserves version)
   * - version: '1.7.1' → Update Gemfile, then bundle install
   * - version: '' (default) → bundle install (respects Gemfile.lock)
   */
  protected async installGems(
    settings: IMetanormaSettings,
    gemfilePath: string
  ): Promise<void> {
    if (settings.bundleUpdate) {
      this.terminal.info('Running bundle update (keeping metanorma-cli version pinned)...');
      await this.bundleUpdateExceptMetanorma();
      this.terminal.success('Dependencies updated (metanorma-cli version preserved)');
    } else if (settings.version === 'latest') {
      this.terminal.info('version: "latest" specified → running bundle update');
      await this.bundleUpdate();
    } else if (settings.version) {
      this.terminal.info(
        `version: "${settings.version}" specified → running bundle install`
      );
      await this.bundleInstall();
    } else {
      this.terminal.info('no version specified → running bundle install (respects Gemfile.lock)');
      await this.bundleInstall();
    }
  }

  /**
   * Run bundle update (keeping metanorma-cli version pinned)
   */
  private async bundleUpdateExceptMetanorma(): Promise<void> {
    const exitCode = await this.execCommand('bundle', ['update', '--except', 'metanorma-cli']);
    if (exitCode !== 0) {
      throw new Error('bundle update --except metanorma-cli failed');
    }
  }

  /**
   * Abstract method: Install runtime dependencies (inkscape, jre, fontconfig)
   * Must be implemented by platform-specific installers
   */
  protected abstract installRuntimeDependencies(
    settings: IMetanormaSettings
  ): Promise<void>;

  /**
   * Abstract method: Install Ruby development headers
   * Must be implemented by platform-specific installers
   */
  protected abstract installRubyDevHeaders(
    settings: IMetanormaSettings
  ): Promise<void>;

  /**
   * Abstract method: Verify Ruby exists
   * Must be implemented by platform-specific installers
   */
  protected abstract verifyRubyExists(): Promise<void>;
}
