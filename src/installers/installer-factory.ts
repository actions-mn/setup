import {Platform, InstallationMethod} from '../platform-detector';
import {IMetanormaInstaller} from './base-installer';
import {BrewInstaller} from './brew-installer';
import {SnapInstaller} from './snap-installer';
import {ChocoInstaller} from './choco-installer';
import {GemUbuntuInstaller} from './gem-ubuntu-installer';
import {GemAlpineInstaller} from './gem-alpine-installer';
import {NativeGemInstaller} from './native-gem-installer';
import {BinaryInstaller} from './binary-installer';
import {IMetanormaSettings} from '../metanorma-settings';
import {LinuxDistribution} from '../container-detector';
import * as core from '@actions/core';

/**
 * Factory for creating platform-specific installers
 */
export class InstallerFactory {
  /**
   * Create an installer for the specified platform and installation method
   */
  static createInstaller(
    platform: Platform,
    installationMethod: InstallationMethod,
    settings: IMetanormaSettings
  ): IMetanormaInstaller {
    // Native installation method
    if (installationMethod === InstallationMethod.Native) {
      return this.createNativeInstaller(platform);
    }

    // Gem installation method
    if (installationMethod === InstallationMethod.Gem) {
      return this.createGemInstaller(platform, settings);
    }

    // Binary installation method
    if (installationMethod === InstallationMethod.Binary) {
      return new BinaryInstaller();
    }

    // Auto detection
    return this.createAutoInstaller(platform, settings);
  }

  /**
   * Create a native package manager installer
   */
  private static createNativeInstaller(platform: Platform): IMetanormaInstaller {
    switch (platform) {
      case Platform.MacOS:
        return new BrewInstaller();
      case Platform.Linux:
        return new SnapInstaller();
      case Platform.Windows:
        return new ChocoInstaller();
      default:
        throw new Error(`No native installer available for platform: ${platform}`);
    }
  }

  /**
   * Create a gem-based installer
   */
  private static createGemInstaller(
    platform: Platform,
    settings: IMetanormaSettings
  ): IMetanormaInstaller {
    // If container detected, use container-specific installer
    if (settings.containerInfo && settings.containerInfo.isContainer) {
      const distribution = settings.containerInfo.distribution;
      if (distribution === 'alpine') {
        core.info('Using Alpine gem installer');
        return new GemAlpineInstaller();
      }
      // Default to Ubuntu installer for ubuntu/debian/unknown
      core.info('Using Ubuntu/Debian gem installer');
      return new GemUbuntuInstaller();
    }

    // Native OS gem installation
    core.info('Using native gem installer (user provides Ruby)');
    return new NativeGemInstaller();
  }

  /**
   * Auto-detect the best installer
   */
  private static createAutoInstaller(
    platform: Platform,
    settings: IMetanormaSettings
  ): IMetanormaInstaller {
    // If container detected, use gem-based installation
    if (settings.containerInfo && settings.containerInfo.isContainer) {
      core.info('Auto-detected container environment → using gem-based installation');
      return this.createGemInstaller(platform, settings);
    }

    // Default to native installation for non-container environments
    core.info('Auto-detected native OS → using native package manager');
    return this.createNativeInstaller(platform);
  }

  /**
   * Create an installer for the specified platform (legacy method for backward compatibility)
   * @deprecated Use createInstaller(platform, installationMethod, settings) instead
   */
  static createInstallerLegacy(platform: Platform): IMetanormaInstaller {
    return this.createNativeInstaller(platform);
  }

  /**
   * Create an installer for the current platform (legacy method for backward compatibility)
   * @deprecated Use createInstaller() with settings instead
   */
  static createForCurrentPlatform(): IMetanormaInstaller {
    const platform = process.platform;
    switch (platform) {
      case 'darwin':
        return new BrewInstaller();
      case 'linux':
        return new SnapInstaller();
      case 'win32':
        return new ChocoInstaller();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
