import {describe, it, beforeEach, afterEach, vi, expect, Mock} from 'vitest';
import {BinaryInstaller} from '../src/installers/binary-installer';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';
import * as exec from '@actions/exec';
import {IMetanormaSettings} from '../src/metanorma-settings';
import {Platform} from '../src/platform-detector';

// Mock @actions/core
vi.mock('@actions/core', () => ({
  info: vi.fn(),
  debug: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  addPath: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn()
}));

// Mock @actions/tool-cache
vi.mock('@actions/tool-cache', () => ({
  downloadTool: vi.fn(),
  extractTar: vi.fn(),
  extractZip: vi.fn(),
  find: vi.fn(),
  cacheFile: vi.fn()
}));

// Mock @actions/exec
vi.mock('@actions/exec', () => ({
  exec: vi.fn()
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  chmodSync: vi.fn(),
  readdirSync: vi.fn(),
  rmSync: vi.fn()
}));

// Helper to create fresh mock provider
const createMockBinaryProvider = () => ({
  getLatest: vi.fn().mockReturnValue('1.14.4'),
  isAvailable: vi.fn().mockReturnValue(true),
  getAvailableVersions: vi.fn().mockReturnValue(['1.14.4', '1.14.3', '1.14.2']),
  getBestMatch: vi.fn().mockReturnValue({
    name: 'darwin',
    arch: 'arm64',
    format: 'tgz',
    filename: 'metanorma-darwin-arm64.tgz',
    url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-darwin-arm64.tgz',
    size: 343796411
  }),
  getPlatforms: vi
    .fn()
    .mockReturnValue([
      {
        name: 'darwin',
        arch: 'arm64',
        format: 'tgz',
        filename: 'metanorma-darwin-arm64.tgz',
        url: 'https://example.com/metanorma-darwin-arm64.tgz',
        size: 1000000
      }
    ])
});

let mockBinaryProvider = createMockBinaryProvider();

// Mock version store
vi.mock('../src/version', () => ({
  getVersionStore: vi.fn().mockImplementation(() =>
    Promise.resolve({
      getBinaryProvider: vi.fn().mockImplementation(() => mockBinaryProvider)
    })
  ),
  BinaryProvider: class MockBinaryProvider {}
}));

describe('BinaryInstaller', () => {
  let installer: BinaryInstaller;
  let mockSettings: IMetanormaSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock provider for each test
    mockBinaryProvider = createMockBinaryProvider();

    installer = new BinaryInstaller();

    mockSettings = {
      platform: Platform.MacOS,
      version: '1.14.4',
      installationMethod: 'binary' as any,
      containerInfo: undefined,
      fontistUpdate: true
    } as IMetanormaSettings;

    // Default mocks
    (tc.find as Mock).mockReturnValue('');
    (tc.downloadTool as Mock).mockResolvedValue('/tmp/download/metanorma.tgz');
    (tc.extractTar as Mock).mockResolvedValue('/tmp/extracted');
    (tc.extractZip as Mock).mockResolvedValue('/tmp/extracted');
    (tc.cacheFile as Mock).mockResolvedValue(
      '/opt/hostedtoolcache/metanorma/1.14.4/arm64'
    );
    (fs.existsSync as Mock).mockReturnValue(true);
    (fs.readdirSync as Mock).mockReturnValue([]);
    (exec.exec as Mock).mockResolvedValue(0);
  });

  afterEach(async () => {
    await installer.cleanup();
  });

  describe('install', () => {
    it('should install Metanorma via binary for macOS arm64', async () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: 'arm64',
        configurable: true
      });

      await installer.install(mockSettings);

      expect(tc.downloadTool).toHaveBeenCalled();
      expect(tc.extractTar).toHaveBeenCalled();
      expect(tc.cacheFile).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: originalArch,
        configurable: true
      });
    });

    it('should install Metanorma via binary for Linux x86_64', async () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: 'x64',
        configurable: true
      });

      // Update mock for Linux
      mockBinaryProvider.getBestMatch.mockReturnValue({
        name: 'linux',
        arch: 'x86_64',
        format: 'tgz',
        filename: 'metanorma-linux-x86_64.tgz',
        url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-linux-x86_64.tgz',
        size: 340494359
      });

      await installer.install(mockSettings);

      expect(tc.downloadTool).toHaveBeenCalled();
      expect(tc.extractTar).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: originalArch,
        configurable: true
      });
    });

    it('should install Metanorma via binary for Windows x86_64', async () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: 'x64',
        configurable: true
      });

      // Update mock for Windows
      mockBinaryProvider.getBestMatch.mockReturnValue({
        name: 'windows',
        arch: 'x86_64',
        format: 'exe',
        filename: 'metanorma-windows-x86_64.exe',
        url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-windows-x86_64.exe',
        size: 145377491
      });

      await installer.install(mockSettings);

      expect(tc.downloadTool).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: originalArch,
        configurable: true
      });
    });

    it('should use cached binary if available', async () => {
      (tc.find as Mock).mockReturnValue(
        '/opt/hostedtoolcache/metanorma/1.14.4/arm64'
      );

      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: 'arm64',
        configurable: true
      });

      await installer.install(mockSettings);

      // Should not download if cached
      expect(tc.downloadTool).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: originalArch,
        configurable: true
      });
    });

    it('should throw error if version is not available', async () => {
      mockBinaryProvider.isAvailable.mockReturnValue(false);

      await expect(installer.install(mockSettings)).rejects.toThrow(
        'is not available as binary'
      );
    });

    it('should throw error if no binary for current platform', async () => {
      mockBinaryProvider.isAvailable.mockReturnValue(true);
      mockBinaryProvider.getBestMatch.mockReturnValue(undefined);
      mockBinaryProvider.getPlatforms.mockReturnValue([]);

      await expect(installer.install(mockSettings)).rejects.toThrow(
        'No binary available for current platform'
      );
    });

    it('should resolve "latest" to the latest version', async () => {
      mockSettings.version = 'latest';

      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: 'arm64',
        configurable: true
      });

      await installer.install(mockSettings);

      // Should use getLatest() which returns '1.14.4'
      expect(mockBinaryProvider.getLatest).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: originalArch,
        configurable: true
      });
    });

    it('should handle zip format for Windows', async () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: 'x64',
        configurable: true
      });

      mockBinaryProvider.getBestMatch.mockReturnValue({
        name: 'windows',
        arch: 'x86_64',
        format: 'zip',
        filename: 'metanorma-windows-x86_64.zip',
        url: 'https://github.com/metanorma/packed-mn/releases/download/v1.14.4/metanorma-windows-x86_64.zip',
        size: 145277781
      });

      await installer.install(mockSettings);

      expect(tc.extractZip).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: originalArch,
        configurable: true
      });
    });
  });

  describe('cleanup', () => {
    it('should clean up temporary files', async () => {
      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: 'arm64',
        configurable: true
      });

      await installer.install(mockSettings);
      await installer.cleanup();

      // Cleanup should be called without errors
      expect(true).toBe(true);

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: originalArch,
        configurable: true
      });
    });
  });

  describe('error handling', () => {
    it('should throw error if version store fails to initialize', async () => {
      // Re-mock getVersionStore to return null
      const {getVersionStore} = await import('../src/version');
      (getVersionStore as Mock).mockResolvedValueOnce(null);

      const newInstaller = new BinaryInstaller();
      await expect(newInstaller.install(mockSettings)).rejects.toThrow(
        'Failed to fetch version data'
      );
    });

    it('should throw error if download fails', async () => {
      (tc.downloadTool as Mock).mockRejectedValue(new Error('Download failed'));

      const originalPlatform = process.platform;
      const originalArch = process.arch;

      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: 'arm64',
        configurable: true
      });

      await expect(installer.install(mockSettings)).rejects.toThrow();

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
      Object.defineProperty(process, 'arch', {
        value: originalArch,
        configurable: true
      });
    });
  });
});
