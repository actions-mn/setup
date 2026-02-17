import {describe, it, beforeEach, vi, expect} from 'vitest';
import * as core from '@actions/core';
import {getInputs} from '../src/input-helper';
import {Platform, InstallationMethod} from '../src/platform-detector';

vi.mock('@actions/core');
vi.mock('../src/container-detector', () => ({
  getInstallationMethod: vi.fn(async (userPreference: string) => {
    const pref = userPreference.toLowerCase();
    if (pref === 'native') {
      return {
        method: InstallationMethod.Native,
        reason: 'User explicitly requested native'
      };
    }
    if (pref === 'gem') {
      return {
        method: InstallationMethod.Gem,
        reason: 'User explicitly requested gem'
      };
    }
    // Default auto behavior
    return {method: InstallationMethod.Native, reason: 'Running on native OS'};
  }),
  detectContainer: vi.fn(async () => ({
    isContainer: false,
    type: 'none',
    hasRuby: false,
    hasMetanorma: false,
    distribution: 'unknown'
  }))
}));

describe('InputHelper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock values
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'auto',
        'bundler-version': '2.6.5',
        gemfile: ''
      };
      return inputs[name] || '';
    });
  });

  it('should get inputs with default values', async () => {
    const result = await getInputs();

    expect(result.version).toBe(null);
    expect(result.snapChannel).toBe('stable');
    expect(result.chocoPrerelease).toBe(false);
    // Platform is detected based on current OS
    expect(result.platform).toBeDefined();
    expect(result.installationMethod).toBe(InstallationMethod.Native); // Auto defaults to native
    expect(result.bundlerVersion).toBe('2.6.5');
    expect(result.gemfile).toBeUndefined();
  });

  it('should parse version input', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '1.7.1',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'auto',
        'bundler-version': '2.6.5',
        gemfile: ''
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.version).toBe('1.7.1');
  });

  it('should parse snap channel input', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'edge',
        'choco-prerelase': '',
        'installation-method': 'auto',
        'bundler-version': '2.6.5',
        gemfile: ''
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.snapChannel).toBe('edge');
  });

  it('should reject invalid snap channel', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'invalid',
        'choco-prerelase': '',
        'installation-method': 'auto',
        'bundler-version': '2.6.5',
        gemfile: ''
      };
      return inputs[name] || '';
    });

    await expect(getInputs()).rejects.toThrow('Invalid snap-channel');
  });

  it('should parse choco prerelease input', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': 'true',
        'installation-method': 'auto',
        'bundler-version': '2.6.5',
        gemfile: ''
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.chocoPrerelease).toBe(true);
  });

  it('should parse installation method input', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'gem',
        'bundler-version': '2.6.5',
        gemfile: ''
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.installationMethod).toBe(InstallationMethod.Gem);
  });

  it('should parse bundler version input', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'auto',
        'bundler-version': '2.5.0',
        gemfile: ''
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.bundlerVersion).toBe('2.5.0');
  });

  it('should parse custom gemfile input', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'gem',
        'bundler-version': '2.6.5',
        gemfile: './custom/Gemfile'
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.gemfile).toBe('./custom/Gemfile');
  });

  it('should parse extra-flavors input as array', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'gem',
        'bundler-version': '2.6.5',
        gemfile: '',
        'extra-flavors': 'bsi nist ribose'
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.extraFlavors).toEqual(['bsi', 'nist', 'ribose']);
  });

  it('should handle extra-flavors with multiple spaces', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'gem',
        'bundler-version': '2.6.5',
        gemfile: '',
        'extra-flavors': '  bsi   nist  '
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.extraFlavors).toEqual(['bsi', 'nist']);
  });

  it('should handle empty extra-flavors input', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'gem',
        'bundler-version': '2.6.5',
        gemfile: '',
        'extra-flavors': ''
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.extraFlavors).toBeUndefined();
  });

  it('should parse github-packages-token input', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'gem',
        'bundler-version': '2.6.5',
        gemfile: '',
        'extra-flavors': 'bsi',
        'github-packages-token': 'ghp_testtoken123'
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.githubPackagesToken).toBe('ghp_testtoken123');
  });

  it('should handle missing github-packages-token input', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        version: '',
        'snap-channel': 'stable',
        'choco-prerelase': '',
        'installation-method': 'gem',
        'bundler-version': '2.6.5',
        gemfile: '',
        'extra-flavors': 'iso'
      };
      return inputs[name] || '';
    });

    const result = await getInputs();

    expect(result.githubPackagesToken).toBeUndefined();
  });
});
