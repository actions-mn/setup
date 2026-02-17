import {info, debug, warning} from '@actions/core';
import {exec} from '@actions/exec';
import type {IMetanormaSettings} from '../metanorma-settings.js';
import {isPrivateFlavor, getFlavorGemName} from './types.js';
import {Terminal} from '../terminal.js';

/**
 * GitHub Packages URL for metanorma organization
 */
const GITHUB_PACKAGES_URL = 'https://rubygems.pkg.github.com/metanorma';

/**
 * BSI fontist private formulas repository URL template
 */
const BSI_FONTIST_REPO_URL =
  'https://metanorma-ci:${TOKEN}@github.com/metanorma/fontist-formulas-private';

/**
 * Handles installation of extra flavor gems
 */
export class FlavorInstaller {
  private settings: IMetanormaSettings;
  private terminal: Terminal;

  constructor(settings: IMetanormaSettings) {
    this.settings = settings;
    this.terminal = new Terminal();
  }

  /**
   * Install all configured flavor gems
   */
  async installFlavors(): Promise<void> {
    if (
      !this.settings.extraFlavors ||
      this.settings.extraFlavors.length === 0
    ) {
      return;
    }

    this.terminal.info(
      `Installing extra flavors: ${this.settings.extraFlavors.join(', ')}`
    );

    // Check if any private flavors require token
    const privateFlavors = this.settings.extraFlavors.filter(isPrivateFlavor);
    if (privateFlavors.length > 0 && !this.settings.githubPackagesToken) {
      throw new Error(
        `Private flavors (${privateFlavors.join(', ')}) require github-packages-token to be set. ` +
          'Please provide a GitHub token with access to rubygems.pkg.github.com/metanorma'
      );
    }

    // Configure GitHub Packages if token is provided
    if (this.settings.githubPackagesToken) {
      await this.configureGitHubPackages();
    }

    // Install each flavor
    for (const flavor of this.settings.extraFlavors) {
      await this.installFlavor(flavor);
    }

    this.terminal.success('All extra flavors installed successfully');
  }

  /**
   * Configure bundler to access GitHub Packages
   */
  private async configureGitHubPackages(): Promise<void> {
    this.terminal.info('Configuring bundler for GitHub Packages');

    const token = this.settings.githubPackagesToken;
    if (!token) {
      throw new Error('GitHub Packages token is required but not provided');
    }

    // Configure bundler to use the token for GitHub Packages
    const exitCode = await this.execCommand('bundle', [
      'config',
      GITHUB_PACKAGES_URL,
      `x-access-token:${token}`
    ]);

    if (exitCode !== 0) {
      throw new Error('Failed to configure bundler for GitHub Packages');
    }

    this.terminal.info('Bundler configured for GitHub Packages');
  }

  /**
   * Install a single flavor gem
   */
  private async installFlavor(flavor: string): Promise<void> {
    const gemName = getFlavorGemName(flavor);
    const isPrivate = isPrivateFlavor(flavor);

    this.terminal.info(`Installing flavor: ${flavor} (${gemName})`);

    if (isPrivate) {
      await this.installPrivateFlavor(flavor, gemName);
    } else {
      await this.installPublicFlavor(flavor, gemName);
    }

    // BSI-specific: setup fontist private formulas
    if (flavor === 'bsi') {
      await this.setupBsiFontist();
    }

    this.terminal.success(`Flavor ${flavor} installed successfully`);
  }

  /**
   * Install a private flavor gem from GitHub Packages
   */
  private async installPrivateFlavor(
    flavor: string,
    gemName: string
  ): Promise<void> {
    this.terminal.info(
      `Installing private flavor ${flavor} from GitHub Packages`
    );

    // Use bundle add with explicit source for private gems
    // Note: Direct bundle add without --skip-install (matches original setup-flavors)
    const exitCode = await this.execCommand('bundle', [
      'add',
      gemName,
      '--source',
      GITHUB_PACKAGES_URL
    ]);

    if (exitCode !== 0) {
      // If bundle add fails, try direct gem install
      this.terminal.warning(
        `bundle add failed for ${gemName}, trying gem install`
      );
      await this.gemInstallPrivate(flavor, gemName);
    }
  }

  /**
   * Install a private flavor gem directly using gem install
   */
  private async gemInstallPrivate(
    flavor: string,
    gemName: string
  ): Promise<void> {
    const token = this.settings.githubPackagesToken;
    if (!token) {
      throw new Error('GitHub Packages token is required for private flavors');
    }

    // Add GitHub Packages as a gem source
    const addSourceExitCode = await this.execCommand('gem', [
      'source',
      '-a',
      GITHUB_PACKAGES_URL
    ]);

    // Configure credentials for the source
    await this.execCommand('gem', [
      'config',
      GITHUB_PACKAGES_URL,
      `x-access-token:${token}`
    ]);

    // Install the gem
    const installExitCode = await this.execCommand('gem', [
      'install',
      gemName,
      '--source',
      GITHUB_PACKAGES_URL
    ]);

    if (installExitCode !== 0) {
      throw new Error(`Failed to install ${gemName} via gem install`);
    }
  }

  /**
   * Install a public flavor gem from RubyGems
   */
  private async installPublicFlavor(
    flavor: string,
    gemName: string
  ): Promise<void> {
    this.terminal.info(`Installing public flavor ${flavor} from RubyGems`);

    // Use bundle add for consistency with the project's bundler setup
    // Note: Direct bundle add without --skip-install (matches original setup-flavors)
    const exitCode = await this.execCommand('bundle', ['add', gemName]);

    if (exitCode !== 0) {
      // If bundle add fails, try direct gem install
      this.terminal.warning(
        `bundle add failed for ${gemName}, trying gem install`
      );
      const gemInstallExitCode = await this.execCommand('gem', [
        'install',
        gemName
      ]);
      if (gemInstallExitCode !== 0) {
        throw new Error(`Failed to install ${gemName}`);
      }
    }
  }

  /**
   * Setup BSI-specific fontist private formulas
   * Required for BSI flavor to access proprietary fonts
   */
  private async setupBsiFontist(): Promise<void> {
    const token = this.settings.githubPackagesToken;
    if (!token) {
      this.terminal.warning(
        'No GitHub token provided, skipping BSI fontist private formulas setup'
      );
      return;
    }

    this.terminal.info('Setting up BSI fontist private formulas');

    // Ensure fontist is available (install via gem if not present)
    const fontistCheck = await this.execCommand('bundle', [
      'exec',
      'fontist',
      '--version'
    ]);

    if (fontistCheck !== 0) {
      this.terminal.info(
        'Fontist not available via bundle, installing via gem'
      );
      const installExitCode = await this.execCommand('gem', [
        'install',
        'fontist'
      ]);
      if (installExitCode !== 0) {
        this.terminal.warning('Failed to install fontist, continuing...');
      }
    }

    // Run fontist update first (matches original setup-flavors behavior)
    await this.execCommand('fontist', ['update']);

    // Setup the private fontist formulas repository
    const repoUrl = BSI_FONTIST_REPO_URL.replace('${TOKEN}', token);

    // fontist repo setup metanorma <url>
    const setupExitCode = await this.execCommand('fontist', [
      'repo',
      'setup',
      'metanorma',
      repoUrl
    ]);

    if (setupExitCode !== 0) {
      // Try via bundle exec as fallback
      const bundleSetupExitCode = await this.execCommand('bundle', [
        'exec',
        'fontist',
        'repo',
        'setup',
        'metanorma',
        repoUrl
      ]);

      if (bundleSetupExitCode !== 0) {
        this.terminal.warning(
          'Failed to setup BSI fontist private formulas repository'
        );
        return;
      }
    }

    // fontist repo update metanorma
    const updateExitCode = await this.execCommand('fontist', [
      'repo',
      'update',
      'metanorma'
    ]);

    if (updateExitCode !== 0) {
      // Try via bundle exec as fallback
      await this.execCommand('bundle', [
        'exec',
        'fontist',
        'repo',
        'update',
        'metanorma'
      ]);
    }

    this.terminal.success('BSI fontist private formulas configured');
  }

  /**
   * Execute a command and return the exit code
   */
  private async execCommand(
    command: string,
    args: string[] = [],
    options: Record<string, unknown> = {}
  ): Promise<number> {
    const fullCommand = [command, ...args].join(' ');
    debug(`FlavorInstaller executing: ${fullCommand}`);
    const result = await exec(command, args, options);
    // When ignoreReturnCode is true, exec returns an object with {code, stdout, stderr}
    // Otherwise it returns the exit code directly
    if (typeof result === 'number') {
      return result;
    }
    // result is an object with code property
    const code = (result as {code?: number}).code;
    return code !== undefined ? code : 1; // Default to 1 (failure) if code is undefined
  }
}

/**
 * Configure bundler to access GitHub Packages
 * This function can be called early to configure authentication before bundle install
 * @param token - GitHub token with access to rubygems.pkg.github.com/metanorma
 */
export async function configureGitHubPackages(token: string): Promise<void> {
  const terminal = new Terminal();
  terminal.info('Configuring bundler for GitHub Packages');

  if (!token) {
    throw new Error('GitHub Packages token is required but not provided');
  }

  // Configure bundler to use the token for GitHub Packages
  const exitCode = await exec('bundle', [
    'config',
    GITHUB_PACKAGES_URL,
    `x-access-token:${token}`
  ]);

  if (exitCode !== 0) {
    throw new Error('Failed to configure bundler for GitHub Packages');
  }

  terminal.info('Bundler configured for GitHub Packages');
}
