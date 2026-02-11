import {IMetanormaSettings} from '../metanorma-settings';
import {GemBaseInstaller} from './gem-base-installer';
import * as core from '@actions/core';

/**
 * Alpine gem-based installer
 * For Docker containers with Alpine base images
 */
export class GemAlpineInstaller extends GemBaseInstaller {
  /**
   * Verify Ruby exists (Alpine has Ruby built-in)
   */
  protected async verifyRubyExists(): Promise<void> {
    if (!(await this.checkRubyInstalled())) {
      throw new Error(
        'Ruby is not installed but is required for gem-based installation.\n\n' +
          'Alpine Linux should have Ruby available by default.\n' +
          'Ensure your Docker image includes Ruby (e.g., alpine:latest).\n\n' +
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
    core.startGroup('Installing Ruby development headers');
    const packages = [
      'ruby-dev',
      'musl-dev',
      'build-base',
      'cmake',
      'pkgconf',
      'openssl-dev',
      'libxml2-dev',
      'libxslt-dev',
      'yaml-dev',
      'zlib-dev',
      'curl-dev',
      'sqlite-dev'
    ];

    core.info(`Installing packages: ${packages.join(', ')}`);
    const updateExitCode = await this.execCommand('apk', ['update']);
    if (updateExitCode !== 0) {
      throw new Error('apk update failed');
    }

    const exitCode = await this.execCommand('apk', ['add', ...packages]);
    if (exitCode !== 0) {
      throw new Error('Failed to install Ruby development headers');
    }

    core.info('✓ Ruby development headers installed');
    core.endGroup();
  }

  /**
   * Install runtime dependencies
   */
  protected async installRuntimeDependencies(
    _settings: IMetanormaSettings
  ): Promise<void> {
    core.startGroup('Installing runtime dependencies');
    const packages = [
      'git',
      'inkscape',
      'openjdk11-jre',
      'python3',
      'fontconfig'
    ];

    core.info(`Installing packages: ${packages.join(', ')}`);
    const exitCode = await this.execCommand('apk', ['add', ...packages]);
    if (exitCode !== 0) {
      throw new Error('Failed to install runtime dependencies');
    }

    core.info('✓ Runtime dependencies installed');
    core.endGroup();
  }

  /**
   * Install Metanorma via gem
   */
  async install(settings: IMetanormaSettings): Promise<void> {
    core.startGroup('Installing Metanorma via gem (Alpine)');

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
