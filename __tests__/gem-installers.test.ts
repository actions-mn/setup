import {describe, it, beforeEach, vi, expect, Mock} from 'vitest';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import {GemUbuntuInstaller} from '../src/installers/gem-ubuntu-installer';
import {GemAlpineInstaller} from '../src/installers/gem-alpine-installer';
import {NativeGemInstaller} from '../src/installers/native-gem-installer';
import {Platform, InstallationMethod} from '../src/platform-detector';

vi.mock('@actions/core');
vi.mock('@actions/exec');
vi.mock('fs');

describe('Gem Installers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exec.exec).mockResolvedValue(0);
    vi.spyOn(fs.promises, 'access').mockRejectedValue({} as never);
    vi.spyOn(fs.promises, 'readFile').mockResolvedValue(
      'source "https://rubygems.org"\ngem "metanorma-cli"' as never
    );
    vi.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined as never);
  });

  describe('GemUbuntuInstaller', () => {
    it('should throw error when Ruby is not installed', async () => {
      vi.mocked(exec.exec).mockImplementation(async (cmd: string) => {
        if (cmd === 'ruby') return 1;
        return 0;
      });

      const installer = new GemUbuntuInstaller();
      const settings = {
        version: '1.14.0',
        snapChannel: 'stable',
        chocoPrerelease: false,
        platform: Platform.Linux,
        installPath: '/workspace',
        installationMethod: InstallationMethod.Gem,
        bundlerVersion: '2.6.5'
      } as any;

      await expect(installer.install(settings)).rejects.toThrow(
        'Ruby is not installed'
      );
    });

    it('should install dependencies and gems when Ruby exists', async () => {
      vi.mocked(exec.exec).mockImplementation(
        async (cmd: string, args?: string[]) => {
          if (cmd === 'ruby') return 0;
          return 0;
        }
      );

      const installer = new GemUbuntuInstaller();
      const settings = {
        version: '1.14.0',
        snapChannel: 'stable',
        chocoPrerelease: false,
        platform: Platform.Linux,
        installPath: '/workspace',
        installationMethod: InstallationMethod.Gem,
        bundlerVersion: '2.6.5',
        containerInfo: {
          isContainer: true,
          type: 'docker',
          hasRuby: true,
          hasMetanorma: false,
          distribution: 'ubuntu'
        }
      } as any;

      await installer.install(settings);

      // Verify installation commands were called
      expect(exec.exec).toHaveBeenCalledWith(
        'sh',
        ['-c', 'apt-get update'],
        expect.anything()
      );
      expect(exec.exec).toHaveBeenCalledWith(
        'sh',
        expect.arrayContaining([
          '-c',
          expect.stringContaining('apt-get install')
        ]),
        expect.anything()
      );
      expect(exec.exec).toHaveBeenCalledWith(
        'bundle',
        ['install'],
        expect.anything()
      );
    });
  });

  describe('GemAlpineInstaller', () => {
    it('should throw error when Ruby is not installed', async () => {
      vi.mocked(exec.exec).mockImplementation(async (cmd: string) => {
        if (cmd === 'ruby') return 1;
        return 0;
      });

      const installer = new GemAlpineInstaller();
      const settings = {
        version: '1.14.0',
        snapChannel: 'stable',
        chocoPrerelease: false,
        platform: Platform.Linux,
        installPath: '/workspace',
        installationMethod: InstallationMethod.Gem,
        bundlerVersion: '2.6.5'
      } as any;

      await expect(installer.install(settings)).rejects.toThrow(
        'Ruby is not installed'
      );
    });

    it('should install Alpine packages and gems when Ruby exists', async () => {
      vi.mocked(exec.exec).mockImplementation(async (cmd: string) => {
        if (cmd === 'ruby') return 0;
        return 0;
      });

      const installer = new GemAlpineInstaller();
      const settings = {
        version: '1.14.0',
        snapChannel: 'stable',
        chocoPrerelease: false,
        platform: Platform.Linux,
        installPath: '/workspace',
        installationMethod: InstallationMethod.Gem,
        bundlerVersion: '2.6.5',
        containerInfo: {
          isContainer: true,
          type: 'docker',
          hasRuby: true,
          hasMetanorma: false,
          distribution: 'alpine'
        }
      } as any;

      await installer.install(settings);

      // Verify installation commands were called
      expect(exec.exec).toHaveBeenCalledWith(
        'apk',
        ['update'],
        expect.anything()
      );
      expect(exec.exec).toHaveBeenCalledWith(
        'apk',
        expect.arrayContaining(['add']),
        expect.anything()
      );
      expect(exec.exec).toHaveBeenCalledWith(
        'bundle',
        ['install'],
        expect.anything()
      );
    });
  });

  describe('NativeGemInstaller', () => {
    it('should throw error when Ruby is not installed', async () => {
      vi.mocked(exec.exec).mockImplementation(async (cmd: string) => {
        if (cmd === 'ruby') return 1;
        return 0;
      });

      const installer = new NativeGemInstaller();
      const settings = {
        version: '1.14.0',
        snapChannel: 'stable',
        chocoPrerelease: false,
        platform: Platform.MacOS,
        installPath: '/workspace',
        installationMethod: InstallationMethod.Gem,
        bundlerVersion: '2.6.5'
      } as any;

      await expect(installer.install(settings)).rejects.toThrow(
        'Ruby is not installed'
      );
    });

    it('should install gems when Ruby exists on macOS', async () => {
      vi.mocked(exec.exec).mockImplementation(async (cmd: string) => {
        if (cmd === 'ruby') return 0;
        if (cmd === 'command') return 1; // No commands found
        return 0;
      });

      const installer = new NativeGemInstaller();
      const settings = {
        version: '1.14.0',
        snapChannel: 'stable',
        chocoPrerelease: false,
        platform: Platform.MacOS,
        installPath: '/workspace',
        installationMethod: InstallationMethod.Gem,
        bundlerVersion: '2.6.5'
      } as any;

      await installer.install(settings);

      expect(exec.exec).toHaveBeenCalledWith(
        'bundle',
        ['install'],
        expect.anything()
      );
    });

    it('should install gems when Ruby exists on Linux', async () => {
      // Mock Linux environment
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true
      });

      vi.mocked(exec.exec).mockImplementation(async (cmd: string) => {
        if (cmd === 'ruby') return 0;
        if (cmd === 'command') return 0; // Has commands
        if (cmd === 'sudo') return 0;
        return 0;
      });

      const installer = new NativeGemInstaller();
      const settings = {
        version: '1.14.0',
        snapChannel: 'stable',
        chocoPrerelease: false,
        platform: Platform.Linux,
        installPath: '/workspace',
        installationMethod: InstallationMethod.Gem,
        bundlerVersion: '2.6.5'
      } as any;

      await installer.install(settings);

      expect(exec.exec).toHaveBeenCalledWith(
        'bundle',
        ['install'],
        expect.anything()
      );

      // Restore platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    });
  });
});
