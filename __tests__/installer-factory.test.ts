import {describe, it, beforeEach, vi, expect} from 'vitest';
import {InstallerFactory} from '../src/installers/installer-factory';
import {Platform, InstallationMethod} from '../src/platform-detector';
import {BrewInstaller} from '../src/installers/brew-installer';
import {SnapInstaller} from '../src/installers/snap-installer';
import {ChocoInstaller} from '../src/installers/choco-installer';
import {GemUbuntuInstaller} from '../src/installers/gem-ubuntu-installer';
import {GemAlpineInstaller} from '../src/installers/gem-alpine-installer';
import {NativeGemInstaller} from '../src/installers/native-gem-installer';
import {BinaryInstaller} from '../src/installers/binary-installer';

vi.mock('@actions/core');

// Mock version store to prevent unhandled errors in tests
vi.mock('../src/version', () => ({
  getVersionStore: vi
    .fn()
    .mockRejectedValue(new Error('Version store not available in tests')),
  VersionDataStore: class MockVersionDataStore {},
  MnenvClient: class MockMnenvClient {},
  VersionProvider: class MockVersionProvider {},
  SnapProvider: class MockSnapProvider {},
  GemfileProvider: class MockGemfileProvider {},
  HomebrewProvider: class MockHomebrewProvider {},
  ChocolateyProvider: class MockChocolateyProvider {},
  BinaryProvider: class MockBinaryProvider {}
}));

describe('InstallerFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInstaller', () => {
    it('should create BrewInstaller for macOS with native method', () => {
      const settings = {
        platform: Platform.MacOS,
        installationMethod: InstallationMethod.Native,
        containerInfo: undefined
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.MacOS,
        InstallationMethod.Native,
        settings
      );

      expect(installer).toBeInstanceOf(BrewInstaller);
    });

    it('should create SnapInstaller for Linux with native method', () => {
      const settings = {
        platform: Platform.Linux,
        installationMethod: InstallationMethod.Native,
        containerInfo: undefined
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.Linux,
        InstallationMethod.Native,
        settings
      );

      expect(installer).toBeInstanceOf(SnapInstaller);
    });

    it('should create ChocoInstaller for Windows with native method', () => {
      const settings = {
        platform: Platform.Windows,
        installationMethod: InstallationMethod.Native,
        containerInfo: undefined
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.Windows,
        InstallationMethod.Native,
        settings
      );

      expect(installer).toBeInstanceOf(ChocoInstaller);
    });

    it('should create GemUbuntuInstaller for Ubuntu container', () => {
      const settings = {
        platform: Platform.Linux,
        installationMethod: InstallationMethod.Gem,
        containerInfo: {
          isContainer: true,
          type: 'docker',
          hasRuby: true,
          hasMetanorma: false,
          distribution: 'ubuntu'
        }
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.Linux,
        InstallationMethod.Gem,
        settings
      );

      expect(installer).toBeInstanceOf(GemUbuntuInstaller);
    });

    it('should create GemAlpineInstaller for Alpine container', () => {
      const settings = {
        platform: Platform.Linux,
        installationMethod: InstallationMethod.Gem,
        containerInfo: {
          isContainer: true,
          type: 'docker',
          hasRuby: true,
          hasMetanorma: false,
          distribution: 'alpine'
        }
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.Linux,
        InstallationMethod.Gem,
        settings
      );

      expect(installer).toBeInstanceOf(GemAlpineInstaller);
    });

    it('should create NativeGemInstaller for native OS with gem method', () => {
      const settings = {
        platform: Platform.MacOS,
        installationMethod: InstallationMethod.Gem,
        containerInfo: {
          isContainer: false,
          type: 'none',
          hasRuby: true,
          hasMetanorma: false,
          distribution: 'unknown'
        }
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.MacOS,
        InstallationMethod.Gem,
        settings
      );

      expect(installer).toBeInstanceOf(NativeGemInstaller);
    });

    it('should auto-detect and use gem installer for containers', () => {
      const settings = {
        platform: Platform.Linux,
        installationMethod: InstallationMethod.Auto,
        containerInfo: {
          isContainer: true,
          type: 'docker',
          hasRuby: true,
          hasMetanorma: false,
          distribution: 'debian'
        }
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.Linux,
        InstallationMethod.Auto,
        settings
      );

      expect(installer).toBeInstanceOf(GemUbuntuInstaller);
    });

    it('should auto-detect and use native installer for native OS', () => {
      const settings = {
        platform: Platform.MacOS,
        installationMethod: InstallationMethod.Auto,
        containerInfo: {
          isContainer: false,
          type: 'none',
          hasRuby: true,
          hasMetanorma: false,
          distribution: 'unknown'
        }
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.MacOS,
        InstallationMethod.Auto,
        settings
      );

      expect(installer).toBeInstanceOf(BrewInstaller);
    });

    it('should create BinaryInstaller for macOS with binary method', () => {
      const settings = {
        platform: Platform.MacOS,
        installationMethod: InstallationMethod.Binary,
        containerInfo: undefined
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.MacOS,
        InstallationMethod.Binary,
        settings
      );

      expect(installer).toBeInstanceOf(BinaryInstaller);
    });

    it('should create BinaryInstaller for Linux with binary method', () => {
      const settings = {
        platform: Platform.Linux,
        installationMethod: InstallationMethod.Binary,
        containerInfo: undefined
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.Linux,
        InstallationMethod.Binary,
        settings
      );

      expect(installer).toBeInstanceOf(BinaryInstaller);
    });

    it('should create BinaryInstaller for Windows with binary method', () => {
      const settings = {
        platform: Platform.Windows,
        installationMethod: InstallationMethod.Binary,
        containerInfo: undefined
      } as any;

      const installer = InstallerFactory.createInstaller(
        Platform.Windows,
        InstallationMethod.Binary,
        settings
      );

      expect(installer).toBeInstanceOf(BinaryInstaller);
    });
  });

  describe('createForCurrentPlatform (legacy)', () => {
    it('should create BrewInstaller on macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true
      });

      const installer = InstallerFactory.createForCurrentPlatform();

      expect(installer).toBeInstanceOf(BrewInstaller);

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });

    it('should create SnapInstaller on Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true
      });

      const installer = InstallerFactory.createForCurrentPlatform();

      expect(installer).toBeInstanceOf(SnapInstaller);

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });

    it('should create ChocoInstaller on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });

      const installer = InstallerFactory.createForCurrentPlatform();

      expect(installer).toBeInstanceOf(ChocoInstaller);

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });
  });
});
