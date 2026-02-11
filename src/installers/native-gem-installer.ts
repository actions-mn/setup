import {IMetanormaSettings} from '../metanorma-settings';
import {GemBaseInstaller} from './gem-base-installer';
import * as core from '@actions/core';
import {Platform} from '../platform-detector';

/**
 * Native OS gem-based installer
 * For native macOS/Linux/Windows where user provides Ruby
 * (via ruby/setup-ruby@v1 or manual installation)
 */
export class NativeGemInstaller extends GemBaseInstaller {
  /**
   * Verify Ruby exists (user must set up first)
   */
  protected async verifyRubyExists(): Promise<void> {
    if (!(await this.checkRubyInstalled())) {
      throw new Error(
        'Ruby is not installed but is required for gem-based installation.\n\n' +
          'Please add this step BEFORE the setup action:\n' +
          '  - uses: ruby/setup-ruby@v1\n' +
          '    with:\n' +
          '      ruby-version: "3.4"\n' +
          '      bundler-cache: true\n\n' +
          'Alternatively, use installation-method: "native" for standalone binary installation.'
      );
    }
  }

  /**
   * Install Ruby development headers and build tools
   * For native Linux, we need to install development packages
   * that ruby/setup-ruby@v1 doesn't provide
   */
  protected async installRubyDevHeaders(
    settings: IMetanormaSettings
  ): Promise<void> {
    // On Linux, install development packages needed for native gem extensions
    if (settings.platform === Platform.Linux) {
      core.startGroup('Installing build dependencies for native gems');

      // Try apt-get first (Debian/Ubuntu)
      const hasApt = await this.commandExists('apt-get');
      if (hasApt) {
        const packages = [
          'build-essential',
          'cmake',
          'pkg-config',
          'libssl-dev',
          'libxml2-dev',
          'libxslt1-dev',
          'zlib1g-dev',
          'libyaml-dev',
          'libcurl4-openssl-dev',
          'libsqlite3-dev'
        ];
        core.info(`Installing packages: ${packages.join(', ')}`);
        const updateExitCode = await this.execCommand('sudo', [
          'apt-get',
          'update'
        ]);
        if (updateExitCode !== 0) {
          throw new Error('apt-get update failed');
        }

        const installExitCode = await this.execCommand('sudo', [
          'apt-get',
          'install',
          '-y',
          ...packages
        ]);
        if (installExitCode !== 0) {
          throw new Error('Failed to install build dependencies');
        }

        core.info('✓ Build dependencies installed');
        core.endGroup();
        return;
      }

      // Try apk (Alpine)
      const hasApk = await this.commandExists('apk');
      if (hasApk) {
        const packages = [
          'build-base',
          'cmake',
          'openssl-dev',
          'libxml2-dev',
          'libxslt-dev',
          'yaml-dev',
          'zlib-dev',
          'curl-dev',
          'sqlite-dev'
        ];
        core.info(`Installing packages: ${packages.join(', ')}`);
        const exitCode = await this.execCommand('sudo', ['apk', 'add', ...packages]);
        if (exitCode !== 0) {
          throw new Error('Failed to install build dependencies');
        }

        core.info('✓ Build dependencies installed');
        core.endGroup();
        return;
      }

      core.warning(
        'Could not detect package manager. Native gems may fail to build.'
      );
      core.endGroup();
    } else {
      core.debug('Skipping Ruby dev headers (not needed on macOS/Windows)');
    }
  }

  /**
   * Install platform-specific runtime dependencies only
   * Ruby is already set up by user via ruby/setup-ruby@v1
   */
  protected async installRuntimeDependencies(
    settings: IMetanormaSettings
  ): Promise<void> {
    core.startGroup('Installing runtime dependencies');

    switch (settings.platform) {
      case Platform.MacOS:
        await this.installMacOSDependencies();
        break;
      case Platform.Linux:
        await this.installLinuxDependencies();
        break;
      case Platform.Windows:
        await this.installWindowsDependencies();
        break;
    }

    core.info('✓ Runtime dependencies installed');
    core.endGroup();
  }

  /**
   * Install macOS runtime dependencies
   */
  private async installMacOSDependencies(): Promise<void> {
    // Check if Inkscape is installed
    const hasInkscape = await this.commandExists('inkscape');
    if (!hasInkscape) {
      core.info('Installing Inkscape via Homebrew...');
      await this.execCommand('brew', ['install', 'inkscape']);
    }

    // Check for Python (usually pre-installed on macOS)
    const hasPython = await this.commandExists('python3');
    if (!hasPython) {
      core.warning('Python3 not found. Some Metanorma features may not work.');
    }
  }

  /**
   * Install Linux runtime dependencies
   */
  private async installLinuxDependencies(): Promise<void> {
    // Try apt-get first (Debian/Ubuntu)
    const hasApt = await this.commandExists('apt-get');
    if (hasApt) {
      const packages = ['git', 'inkscape', 'default-jre', 'fontconfig'];
      core.info(`Installing packages via apt-get: ${packages.join(', ')}`);
      await this.execCommand('sudo', [
        'apt-get',
        'install',
        '-y',
        ...packages
      ]);
      return;
    }

    // Try yum (RHEL/CentOS/Fedora)
    const hasYum = await this.commandExists('yum');
    if (hasYum) {
      const packages = ['git', 'inkscape', 'java-11-openjdk', 'fontconfig'];
      core.info(`Installing packages via yum: ${packages.join(', ')}`);
      await this.execCommand('sudo', ['yum', 'install', '-y', ...packages]);
      return;
    }

    // Try dnf (Fedora)
    const hasDnf = await this.commandExists('dnf');
    if (hasDnf) {
      const packages = ['git', 'inkscape', 'java-11-openjdk', 'fontconfig'];
      core.info(`Installing packages via dnf: ${packages.join(', ')}`);
      await this.execCommand('sudo', ['dnf', 'install', '-y', ...packages]);
      return;
    }

    // Try apk (Alpine)
    const hasApk = await this.commandExists('apk');
    if (hasApk) {
      const packages = ['git', 'inkscape', 'openjdk11-jre', 'fontconfig'];
      core.info(`Installing packages via apk: ${packages.join(', ')}`);
      await this.execCommand('apk', ['add', ...packages]);
      return;
    }

    core.warning(
      'Could not detect package manager. Please install Git, Inkscape, JRE, and fontconfig manually.'
    );
  }

  /**
   * Install Windows runtime dependencies
   */
  private async installWindowsDependencies(): Promise<void> {
    // Check for Chocolatey
    const hasChoco = await this.commandExists('choco');
    if (hasChoco) {
      core.info('Installing dependencies via Chocolatey...');
      await this.execCommand('choco', [
        'install',
        'inkscape',
        '-y',
        '--no-progress'
      ]);
    } else {
      core.warning(
        'Chocolatey not found. Please install Inkscape manually.'
      );
    }
  }

  /**
   * Install Metanorma via gem on native OS
   */
  async install(settings: IMetanormaSettings): Promise<void> {
    core.startGroup('Installing Metanorma via gem (Native OS)');

    try {
      // Verify Ruby exists
      await this.verifyRubyExists();

      // Install build dependencies for native gem extensions
      await this.installRubyDevHeaders(settings);

      // Install runtime dependencies
      await this.installRuntimeDependencies(settings);

      // Setup Gemfile
      const gemfilePath = await this.setupGemfile(settings);

      // Ensure Bundler
      await this.ensureBundler(settings);

      // Install gems
      await this.installGems(settings, gemfilePath);

      // Update Fontist (if enabled)
      if (settings.fontistUpdate !== false) {
        await this.updateFontist();
      }

      // Verify installation
      await this.verifyInstallation();

      core.info('✓ Metanorma installed successfully via gem');
    } finally {
      core.endGroup();
    }
  }

  /**
   * Cleanup (no-op for gem installation)
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for gem-based installation
  }
}
