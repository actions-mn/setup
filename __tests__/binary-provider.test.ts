import {describe, it, beforeEach, vi, expect} from 'vitest';
import {BinaryProvider} from '../src/version/providers/binary-provider';
import {MnenvAllVersions} from '../src/version/types/mnenv-types';

// Mock @actions/core
vi.mock('@actions/core', () => ({
  info: vi.fn(),
  debug: vi.fn(),
  warning: vi.fn(),
  error: vi.fn()
}));

// Sample mock data matching the metanorma/versions structure
const mockBinaryData: MnenvAllVersions = {
  gemfile: { count: 0, latest: '', versions: [] },
  snap: { count: 0, latest: '', versions: [] },
  homebrew: { count: 0, latest: '', versions: [] },
  chocolatey: { count: 0, latest: '', versions: [] },
  binary: {
    count: 3,
    latest: '1.14.4',
    versions: [
      {
        version: '1.14.4',
        tag_name: 'v1.14.4',
        html_url: 'https://github.com/metanorma/packed-mn/releases/tag/v1.14.4',
        published_at: '2025-12-01T23:21:36Z',
        parsed_at: '2026-02-13T12:41:38Z',
        display_name: '1.14.4',
        platforms: [
          {
            name: 'darwin',
            arch: 'arm64',
            format: 'tgz',
            filename: 'metanorma-darwin-arm64.tgz',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-darwin-arm64.tgz',
            size: 343796411
          },
          {
            name: 'linux',
            arch: 'x86_64',
            format: 'tgz',
            filename: 'metanorma-linux-x86_64.tgz',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-linux-x86_64.tgz',
            size: 340494359
          },
          {
            name: 'linux',
            arch: 'x86_64',
            format: 'tgz',
            filename: 'metanorma-linux-musl-x86_64.tgz',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-linux-musl-x86_64.tgz',
            size: 340508971,
            variant: 'musl'
          },
          {
            name: 'linux',
            arch: 'aarch64',
            format: 'tgz',
            filename: 'metanorma-linux-aarch64.tgz',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-linux-aarch64.tgz',
            size: 335355982
          },
          {
            name: 'windows',
            arch: 'x86_64',
            format: 'exe',
            filename: 'metanorma-windows-x86_64.exe',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-windows-x86_64.exe',
            size: 145377491
          },
          {
            name: 'windows',
            arch: 'x86_64',
            format: 'zip',
            filename: 'metanorma-windows-x86_64.zip',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-windows-x86_64.zip',
            size: 145277781
          }
        ]
      },
      {
        version: '1.14.3',
        tag_name: 'v1.14.3',
        html_url: 'https://github.com/metanorma/packed-mn/releases/tag/v1.14.3',
        published_at: '2025-11-18T15:58:50Z',
        parsed_at: '2026-02-13T12:41:38Z',
        display_name: '1.14.3',
        platforms: [
          {
            name: 'darwin',
            arch: 'arm64',
            format: 'tgz',
            filename: 'metanorma-darwin-arm64.tgz',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.3/metanorma-darwin-arm64.tgz',
            size: 343280117
          },
          {
            name: 'linux',
            arch: 'x86_64',
            format: 'tgz',
            filename: 'metanorma-linux-x86_64.tgz',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.3/metanorma-linux-x86_64.tgz',
            size: 340494359
          },
          {
            name: 'windows',
            arch: 'x86_64',
            format: 'exe',
            filename: 'metanorma-windows-x86_64.exe',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.3/metanorma-windows-x86_64.exe',
            size: 145377491
          }
        ]
      },
      {
        version: '1.14.2',
        tag_name: 'v1.14.2',
        html_url: 'https://github.com/metanorma/packed-mn/releases/tag/v1.14.2',
        published_at: '2025-11-01T10:00:00Z',
        parsed_at: '2026-02-13T12:41:38Z',
        display_name: '1.14.2',
        platforms: [
          {
            name: 'darwin',
            arch: 'arm64',
            format: 'tgz',
            filename: 'metanorma-darwin-arm64.tgz',
            url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.2/metanorma-darwin-arm64.tgz',
            size: 340000000
          }
        ]
      }
    ]
  }
};

describe('BinaryProvider', () => {
  let provider: BinaryProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new BinaryProvider(mockBinaryData);
  });

  describe('platform property', () => {
    it('should return "binary" as platform identifier', () => {
      expect(provider.platform).toBe('binary');
    });
  });

  describe('getLatest', () => {
    it('should return the latest version', () => {
      expect(provider.getLatest()).toBe('1.14.4');
    });
  });

  describe('isAvailable', () => {
    it('should return true for available versions', () => {
      expect(provider.isAvailable('1.14.4')).toBe(true);
      expect(provider.isAvailable('1.14.3')).toBe(true);
      expect(provider.isAvailable('1.14.2')).toBe(true);
    });

    it('should return false for unavailable versions', () => {
      expect(provider.isAvailable('1.0.0')).toBe(false);
      expect(provider.isAvailable('99.99.99')).toBe(false);
    });
  });

  describe('getAvailableVersions', () => {
    it('should return all available version numbers', () => {
      const versions = provider.getAvailableVersions();
      expect(versions).toEqual(['1.14.4', '1.14.3', '1.14.2']);
    });
  });

  describe('getPlatforms', () => {
    it('should return all platforms for a version', () => {
      const platforms = provider.getPlatforms('1.14.4');
      expect(platforms).toHaveLength(6);
      expect(platforms.map(p => p.name)).toContain('darwin');
      expect(platforms.map(p => p.name)).toContain('linux');
      expect(platforms.map(p => p.name)).toContain('windows');
    });

    it('should return empty array for unknown version', () => {
      const platforms = provider.getPlatforms('99.99.99');
      expect(platforms).toEqual([]);
    });
  });

  describe('getArtifact', () => {
    it('should return artifact for darwin arm64', () => {
      const artifact = provider.getArtifact('1.14.4', 'darwin', 'arm64');
      expect(artifact).toBeDefined();
      expect(artifact?.name).toBe('darwin');
      expect(artifact?.arch).toBe('arm64');
      expect(artifact?.format).toBe('tgz');
    });

    it('should return artifact for linux x86_64', () => {
      const artifact = provider.getArtifact('1.14.4', 'linux', 'x86_64');
      expect(artifact).toBeDefined();
      expect(artifact?.name).toBe('linux');
      expect(artifact?.arch).toBe('x86_64');
      expect(artifact?.format).toBe('tgz');
      expect(artifact?.variant).toBeUndefined();
    });

    it('should return artifact for linux x86_64 with musl variant', () => {
      const artifact = provider.getArtifact('1.14.4', 'linux', 'x86_64', 'musl');
      expect(artifact).toBeDefined();
      expect(artifact?.name).toBe('linux');
      expect(artifact?.arch).toBe('x86_64');
      expect(artifact?.variant).toBe('musl');
    });

    it('should return artifact for linux aarch64', () => {
      const artifact = provider.getArtifact('1.14.4', 'linux', 'aarch64');
      expect(artifact).toBeDefined();
      expect(artifact?.name).toBe('linux');
      expect(artifact?.arch).toBe('aarch64');
    });

    it('should return artifact for windows x86_64', () => {
      const artifact = provider.getArtifact('1.14.4', 'windows', 'x86_64');
      expect(artifact).toBeDefined();
      expect(artifact?.name).toBe('windows');
      expect(artifact?.arch).toBe('x86_64');
      // Should return first match (exe format)
      expect(artifact?.format).toBe('exe');
    });

    it('should return undefined for unknown platform/arch combination', () => {
      const artifact = provider.getArtifact('1.14.4', 'freebsd', 'x86_64');
      expect(artifact).toBeUndefined();
    });
  });

  describe('getBestMatch', () => {
    it('should match darwin arm64 (M1/M2 Mac)', () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      Object.defineProperty(process, 'arch', { value: 'arm64', configurable: true });

      const match = provider.getBestMatch('1.14.4');
      expect(match).toBeDefined();
      expect(match?.name).toBe('darwin');
      expect(match?.arch).toBe('arm64');

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
      Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
    });

    it('should match linux x86_64', () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

      const match = provider.getBestMatch('1.14.4');
      expect(match).toBeDefined();
      expect(match?.name).toBe('linux');
      expect(match?.arch).toBe('x86_64');

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
      Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
    });

    it('should match linux aarch64 (ARM servers)', () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      Object.defineProperty(process, 'arch', { value: 'arm64', configurable: true });

      const match = provider.getBestMatch('1.14.4');
      expect(match).toBeDefined();
      expect(match?.name).toBe('linux');
      expect(match?.arch).toBe('aarch64');

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
      Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
    });

    it('should match windows x86_64', () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

      const match = provider.getBestMatch('1.14.4');
      expect(match).toBeDefined();
      expect(match?.name).toBe('windows');
      expect(match?.arch).toBe('x86_64');

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
      Object.defineProperty(process, 'arch', { value: originalArch, configurable: true });
    });
  });

  describe('getDownloadUrl', () => {
    it('should return download URL for specific platform and arch', () => {
      const url = provider.getDownloadUrl('1.14.4', 'darwin', 'arm64');
      expect(url).toBe('https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-darwin-arm64.tgz');
    });

    it('should return download URL for linux x86_64', () => {
      const url = provider.getDownloadUrl('1.14.4', 'linux', 'x86_64');
      expect(url).toBe('https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-linux-x86_64.tgz');
    });

    it('should return download URL for windows x86_64', () => {
      const url = provider.getDownloadUrl('1.14.4', 'windows', 'x86_64');
      expect(url).toBe('https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-windows-x86_64.exe');
    });

    it('should return undefined for unknown platform/arch', () => {
      const url = provider.getDownloadUrl('1.14.4', 'freebsd', 'x86_64');
      expect(url).toBeUndefined();
    });
  });

  describe('getAvailablePlatforms', () => {
    it('should return all available platform names for a version', () => {
      const platforms = provider.getAvailablePlatforms('1.14.4');
      expect(platforms).toContain('darwin');
      expect(platforms).toContain('linux');
      expect(platforms).toContain('windows');
    });

    it('should return empty array for unknown version', () => {
      const platforms = provider.getAvailablePlatforms('99.99.99');
      expect(platforms).toEqual([]);
    });
  });

  describe('getAvailableArchitectures', () => {
    it('should return architectures for darwin', () => {
      const archs = provider.getAvailableArchitectures('1.14.4', 'darwin');
      expect(archs).toContain('arm64');
    });

    it('should return architectures for linux', () => {
      const archs = provider.getAvailableArchitectures('1.14.4', 'linux');
      expect(archs).toContain('x86_64');
      expect(archs).toContain('aarch64');
    });

    it('should return architectures for windows', () => {
      const archs = provider.getAvailableArchitectures('1.14.4', 'windows');
      expect(archs).toContain('x86_64');
    });
  });

  describe('getVersion', () => {
    it('should return version info for existing version', () => {
      const version = provider.getVersion('1.14.4');
      expect(version).toBeDefined();
      expect(version?.version).toBe('1.14.4');
      expect(version?.tagName).toBe('v1.14.4');
      expect(version?.platforms).toHaveLength(6);
    });

    it('should return undefined for non-existing version', () => {
      const version = provider.getVersion('99.99.99');
      expect(version).toBeUndefined();
    });
  });
});
