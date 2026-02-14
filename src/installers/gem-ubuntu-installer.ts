import type {IMetanormaSettings} from '../metanorma-settings.js';
import {GemBaseInstaller} from './gem-base-installer.js';
import {startGroup, endGroup, info} from '@actions/core';

/**
 * Ubuntu/Debian gem-based installer
 * For Docker containers with Ubuntu/Debian base images
 */
export class GemUbuntuInstaller extends GemBaseInstaller {
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
   * Install Ruby development headers for native gem compilation
   */
  protected async installRubyDevHeaders(
    _settings: IMetanormaSettings
  ): Promise<void> {
    startGroup('Installing Ruby development headers');
    const packages = [
      'ruby-dev',
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

    info(`Installing packages: ${packages.join(', ')}`);
    const updateExitCode = await this.execCommand('sh', [
      '-c',
      'apt-get update'
    ]);
    if (updateExitCode !== 0) {
      throw new Error('apt-get update failed');
    }

    const installExitCode = await this.execCommand('sh', [
      '-c',
      `apt-get install -y ${packages.join(' ')}`
    ]);
    if (installExitCode !== 0) {
      throw new Error('Failed to install Ruby development headers');
    }

    info('✓ Ruby development headers installed');
    endGroup();
  }

  /**
   * Install runtime dependencies
   */
  protected async installRuntimeDependencies(
    _settings: IMetanormaSettings
  ): Promise<void> {
    startGroup('Installing runtime dependencies');
    const packages = [
      'git',
      'inkscape',
      'default-jre',
      'python3',
      'fontconfig'
    ];

    info(`Installing packages: ${packages.join(', ')}`);
    const exitCode = await this.execCommand('sh', [
      '-c',
      `apt-get install -y ${packages.join(' ')}`
    ]);
    if (exitCode !== 0) {
      throw new Error('Failed to install runtime dependencies');
    }

    info('✓ Runtime dependencies installed');
    endGroup();
  }

  /**
   * Install Metanorma via gem
   */
  async install(settings: IMetanormaSettings): Promise<void> {
    startGroup('Installing Metanorma via gem (Ubuntu/Debian)');

    try {
      // Verify Ruby exists
      await this.verifyRubyExists();

      // Install Ruby development headers
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

      info('✓ Metanorma installed successfully via gem');
    } finally {
      endGroup();
    }
  }

  /**
   * Cleanup (no-op for gem installation)
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for gem-based installation
  }
}
