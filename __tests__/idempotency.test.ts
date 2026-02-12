import {describe, it, expect, vi} from 'vitest';
import {IdempotencyManager, InstallationState} from '../src/idempotency';
import {IMetanormaSettings} from '../src/metanorma-settings';
import {Platform, InstallationMethod} from '../src/platform-detector';

// Mock @actions/core
vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  debug: vi.fn(),
  setOutput: vi.fn(),
  getInput: vi.fn(),
  saveState: vi.fn(),
  getState: vi.fn()
}));

// Mock @actions/exec
vi.mock('@actions/exec', () => ({
  exec: vi.fn().mockResolvedValue(0)
}));

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  promises: {
    readFile: vi.fn().mockResolvedValue('{}'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('IdempotencyManager', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/tmp/workspace');
      const manager = new IdempotencyManager();
      expect(manager).toBeDefined();
      expect(manager.getStateFilePath()).toContain(
        '.metanorma-setup-state.json'
      );
    });

    it('should create instance with custom config', () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/tmp/workspace');
      const manager = new IdempotencyManager({
        stateFileName: 'custom-state.json',
        enabled: false
      });
      expect(manager.getStateFilePath()).toContain('custom-state.json');
    });
  });

  describe('getStateFilePath', () => {
    it('should return path containing state file name', () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/tmp/workspace');
      const manager = new IdempotencyManager({
        stateFileName: 'test-state.json'
      });
      expect(manager.getStateFilePath()).toContain('test-state.json');
    });

    it('should return path containing workspace', () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/tmp/test-workspace');
      const manager = new IdempotencyManager();
      expect(manager.getStateFilePath()).toContain('/tmp/test-workspace');
    });
  });

  describe('checkAndSkipIfAlreadyInstalled', () => {
    it('should not skip when idempotency is disabled', async () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/tmp/workspace');
      const manager = new IdempotencyManager({enabled: false});

      const settings: IMetanormaSettings = {
        platform: Platform.Linux,
        installationMethod: InstallationMethod.Native,
        version: '1.14.3',
        snapChannel: 'stable',
        chocoPrerelease: false,
        installPath: '/tmp/workspace',
        bundlerVersion: '2.6.5',
        fontistUpdate: true,
        bundleUpdate: false,
        usePrebuiltLocks: true
      };

      const result = await manager.checkAndSkipIfAlreadyInstalled(settings);
      expect(result.shouldSkip).toBe(false);
      expect(result.reason).toBe('not_installed');
    });
  });

  describe('InstallationState', () => {
    it('should have correct structure', () => {
      const state: InstallationState = {
        platform: 'linux',
        installationMethod: 'native',
        version: '1.14.3',
        installPath: '/tmp/workspace',
        installedAt: new Date().toISOString(),
        metanormaVersion: '1.14.3',
        checksum: 'abc123'
      };

      expect(state.platform).toBe('linux');
      expect(state.installationMethod).toBe('native');
      expect(state.version).toBe('1.14.3');
      expect(state.checksum).toBe('abc123');
    });
  });
});
