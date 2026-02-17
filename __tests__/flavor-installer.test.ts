import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {FlavorInstaller} from '../src/flavors/flavor-installer.js';
import type {IMetanormaSettings} from '../src/metanorma-settings.js';
import * as exec from '@actions/exec';

// Mock @actions/exec
vi.mock('@actions/exec', () => ({
  exec: vi.fn()
}));

// Mock @actions/core
vi.mock('@actions/core', () => ({
  info: vi.fn(),
  debug: vi.fn(),
  warning: vi.fn(),
  error: vi.fn()
}));

// Mock Terminal
vi.mock('../src/terminal.js', () => ({
  Terminal: class {
    info = vi.fn();
    success = vi.fn();
    warning = vi.fn();
    error = vi.fn();
    debug = vi.fn();
  }
}));

describe('FlavorInstaller', () => {
  let mockExec: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExec = vi.mocked(exec.exec);
    // Default mock - return 0 (success)
    mockExec.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createSettings = (
    overrides: Partial<IMetanormaSettings> = {}
  ): IMetanormaSettings =>
    ({
      version: null,
      snapChannel: 'stable',
      chocoPrerelease: false,
      platform: 'linux',
      installPath: '/tmp',
      installationMethod: 'gem',
      ...overrides
    }) as IMetanormaSettings;

  describe('installFlavors', () => {
    it('should do nothing when no flavors are configured', async () => {
      const settings = createSettings({extraFlavors: []});
      const installer = new FlavorInstaller(settings);

      await installer.installFlavors();

      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should do nothing when extraFlavors is undefined', async () => {
      const settings = createSettings();
      const installer = new FlavorInstaller(settings);

      await installer.installFlavors();

      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should throw error when private flavors are requested without token', async () => {
      const settings = createSettings({
        extraFlavors: ['bsi'],
        githubPackagesToken: undefined
      });
      const installer = new FlavorInstaller(settings);

      await expect(installer.installFlavors()).rejects.toThrow(
        'Private flavors (bsi) require github-packages-token to be set'
      );
    });

    it('should configure GitHub Packages when token is provided', async () => {
      const settings = createSettings({
        extraFlavors: ['bsi'],
        githubPackagesToken: 'test-token'
      });
      const installer = new FlavorInstaller(settings);

      await installer.installFlavors();

      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining([
          'config',
          'https://rubygems.pkg.github.com/metanorma'
        ]),
        expect.any(Object)
      );
    });

    it('should install public flavor from RubyGems', async () => {
      const settings = createSettings({
        extraFlavors: ['iso']
      });
      const installer = new FlavorInstaller(settings);

      await installer.installFlavors();

      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining(['add', 'metanorma-iso']),
        expect.any(Object)
      );
    });

    it('should install private flavor from GitHub Packages', async () => {
      const settings = createSettings({
        extraFlavors: ['bsi'],
        githubPackagesToken: 'test-token'
      });
      const installer = new FlavorInstaller(settings);

      await installer.installFlavors();

      // Should configure GitHub Packages
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining(['config']),
        expect.any(Object)
      );

      // Should add private gem with source
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining([
          'add',
          'metanorma-bsi',
          '--source',
          'https://rubygems.pkg.github.com/metanorma'
        ]),
        expect.any(Object)
      );
    });

    it('should setup BSI fontist private formulas when BSI flavor is installed', async () => {
      const settings = createSettings({
        extraFlavors: ['bsi'],
        githubPackagesToken: 'test-token'
      });
      const installer = new FlavorInstaller(settings);

      await installer.installFlavors();

      // Should configure GitHub Packages
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining(['config']),
        expect.any(Object)
      );

      // Should add private gem with source
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining([
          'add',
          'metanorma-bsi',
          '--source',
          'https://rubygems.pkg.github.com/metanorma'
        ]),
        expect.any(Object)
      );

      // Should check fontist version
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining(['exec', 'fontist', '--version']),
        expect.any(Object)
      );

      // Should run fontist update
      expect(mockExec).toHaveBeenCalledWith(
        'fontist',
        expect.arrayContaining(['update']),
        expect.any(Object)
      );

      // Should setup fontist repo
      expect(mockExec).toHaveBeenCalledWith(
        'fontist',
        expect.arrayContaining(['repo', 'setup', 'metanorma']),
        expect.any(Object)
      );

      // Should update fontist repo
      expect(mockExec).toHaveBeenCalledWith(
        'fontist',
        expect.arrayContaining(['repo', 'update', 'metanorma']),
        expect.any(Object)
      );
    });

    it('should install multiple flavors', async () => {
      const settings = createSettings({
        extraFlavors: ['iso', 'ietf'],
        githubPackagesToken: undefined
      });
      const installer = new FlavorInstaller(settings);

      await installer.installFlavors();

      // Should install both public flavors
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining(['add', 'metanorma-iso']),
        expect.any(Object)
      );
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining(['add', 'metanorma-ietf']),
        expect.any(Object)
      );
    });

    it('should install mix of public and private flavors', async () => {
      const settings = createSettings({
        extraFlavors: ['iso', 'bsi'],
        githubPackagesToken: 'test-token'
      });
      const installer = new FlavorInstaller(settings);

      await installer.installFlavors();

      // Should configure GitHub Packages for private flavor
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining(['config']),
        expect.any(Object)
      );

      // Should install both flavors
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining(['add', 'metanorma-iso']),
        expect.any(Object)
      );
      expect(mockExec).toHaveBeenCalledWith(
        'bundle',
        expect.arrayContaining(['add', 'metanorma-bsi']),
        expect.any(Object)
      );
    });
  });
});
