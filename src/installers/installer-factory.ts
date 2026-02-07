import {Platform} from '../platform-detector';
import {IMetanormaInstaller} from './base-installer';
import {BrewInstaller} from './brew-installer';
import {SnapInstaller} from './snap-installer';
import {ChocoInstaller} from './choco-installer';

/**
 * Factory for creating platform-specific installers
 */
export class InstallerFactory {
  /**
   * Create an installer for the specified platform
   */
  static createInstaller(platform: Platform): IMetanormaInstaller {
    switch (platform) {
      case Platform.MacOS:
        return new BrewInstaller();
      case Platform.Linux:
        return new SnapInstaller();
      case Platform.Windows:
        return new ChocoInstaller();
      default:
        throw new Error(`No installer available for platform: ${platform}`);
    }
  }

  /**
   * Create an installer for the current platform
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
