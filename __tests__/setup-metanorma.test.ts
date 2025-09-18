import * as io from '@actions/io';
import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as path from 'path';

jest.mock('@actions/exec');
jest.mock('@actions/core');

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    body: {},
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
  } as any)
);

const toolDir = path.join(__dirname, 'runner', 'tools');
const tempDir = path.join(__dirname, 'runner', 'temp');

process.env['AGENT_TOOLSDIRECTORY'] = toolDir;
process.env['RUNNER_TOOL_CACHE'] = toolDir;
process.env['RUNNER_TEMP'] = tempDir;

import {installMetanormaVersion} from '../src/installer';

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

describe('Metanorma Installation', () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
    (exec.exec as jest.Mock).mockResolvedValue(0);
  });

  afterAll(async () => {
    try {
      await io.rmRF(toolDir);
      await io.rmRF(tempDir);
    } catch {
      console.log('Failed to remove test directories');
    }
  }, 100000);

  it('install metanorma with null version', async () => {
    await installMetanormaVersion('', 'stable', false);
    let cmd: string | null = null;
    if (IS_MACOSX) {
      cmd = 'brew install metanorma/metanorma/metanorma';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma';
    } else if (IS_WINDOWS) {
      cmd = 'choco install metanorma --yes --no-progress';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    expect(core.addPath).not.toBeCalled();
  });

  it('install metanorma with "" version', async () => {
    await installMetanormaVersion('', 'stable', false);

    let cmd: string | null = null;
    if (IS_MACOSX) {
      cmd = 'brew install metanorma/metanorma/metanorma';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma';
    } else if (IS_WINDOWS) {
      cmd = 'choco install metanorma --yes --no-progress';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    expect(exec.exec).toHaveReturnedWith(Promise.resolve(0));
    expect(core.addPath).not.toBeCalled();
  });

  it('install metanorma with platform-specific versions', async () => {
    // Test with platform-specific available versions
    let version: string;
    let cmd: string | null = null;

    if (IS_MACOSX) {
      version = '1.13.2'; // Homebrew version
      await installMetanormaVersion(version, 'stable', false);
      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/metanorma/homebrew-metanorma/' +
          'v1.13.2/Formula/metanorma.rb'
      );
      cmd = 'brew install --formula metanorma.rb';
    } else if (IS_LINUX) {
      version = '1.13.6'; // Snap version
      await installMetanormaVersion(version, 'stable', false);
      cmd = 'sudo snap install metanorma --channel=1.13.6/stable --classic';
    } else if (IS_WINDOWS) {
      version = '1.13.6'; // Chocolatey version
      await installMetanormaVersion(version, 'stable', false);
      cmd = 'choco install metanorma --yes --no-progress --version 1.13.6';
    }

    expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    expect(exec.exec).toHaveReturnedWith(Promise.resolve(0));
    expect(core.addPath).not.toBeCalled();
  });

  it('install metanorma allow --pre', async () => {
    await installMetanormaVersion('', 'stable', true);

    let cmd: string | null = null;
    if (IS_MACOSX) {
      cmd = 'brew install metanorma/metanorma/metanorma';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma';
    } else if (IS_WINDOWS) {
      cmd = 'choco install metanorma --yes --no-progress --pre';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    expect(exec.exec).toHaveReturnedWith(Promise.resolve(0));
    expect(core.addPath).not.toBeCalled();
  });

  it('install metanorma snap edge channel', async () => {
    await installMetanormaVersion('1.13.6', 'edge', true);

    let cmd: string | null = null;
    if (IS_MACOSX) {
      cmd = 'brew install --formula metanorma.rb';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma --channel=1.13.6/edge --classic';
    } else if (IS_WINDOWS) {
      cmd =
        'choco install metanorma --yes --no-progress --pre --version 1.13.6-pre';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    expect(exec.exec).toHaveReturnedWith(Promise.resolve(0));
    expect(core.addPath).not.toBeCalled();
  });
});

describe('Environment Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect commands correctly on different platforms', async () => {
    const mockExec = exec.exec as jest.Mock;

    // Mock successful command detection
    mockExec.mockResolvedValue(0);

    // Import the function we want to test
    const { checkCommandExists } = jest.requireActual('../src/setup-metanorma');

    const result = await checkCommandExists('ruby');
    expect(result).toBe(true);

    if (IS_WINDOWS) {
      expect(mockExec).toHaveBeenCalledWith('where', ['ruby'], { silent: true });
    } else {
      expect(mockExec).toHaveBeenCalledWith('which', ['ruby'], { silent: true });
    }
  });

  it('should return false when command does not exist', async () => {
    const mockExec = exec.exec as jest.Mock;

    // Mock command not found
    mockExec.mockRejectedValue(new Error('Command not found'));

    const { checkCommandExists } = jest.requireActual('../src/setup-metanorma');

    const result = await checkCommandExists('nonexistent-command');
    expect(result).toBe(false);
  });

  it('should check environment status for all required tools', async () => {
    const mockExec = exec.exec as jest.Mock;

    // Mock different command availability scenarios
    mockExec
      .mockResolvedValueOnce(0) // ruby exists
      .mockResolvedValueOnce(0) // bundle exists
      .mockRejectedValueOnce(new Error('Command not found')) // inkscape missing
      .mockRejectedValueOnce(new Error('Command not found')); // metanorma missing

    const { checkEnvironmentStatus } = jest.requireActual('../src/setup-metanorma');

    const status = await checkEnvironmentStatus();

    expect(status).toEqual({
      ruby: true,
      bundler: true,
      inkscape: false,
      metanorma: false
    });
    expect(core.info).toHaveBeenCalledWith('Checking environment status...');
  });
});

describe('Bundler Environment Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should setup Ruby environment when not available', async () => {
    const mockExec = exec.exec as jest.Mock;

    // Mock Ruby and bundler being available after setup
    mockExec.mockResolvedValue(0);

    const { setupRubyWithBundler } = jest.requireActual('../src/setup-metanorma');

    await setupRubyWithBundler();

    expect(core.exportVariable).toHaveBeenCalledWith('INPUT_RUBY_VERSION', '3.3');
    expect(core.exportVariable).toHaveBeenCalledWith('INPUT_BUNDLER_CACHE', 'true');
    expect(core.info).toHaveBeenCalledWith('Setting up Ruby environment via ruby/setup-ruby@v1...');
  });

  it('should install Inkscape via cross-platform action', async () => {
    const { installInkscapeCrossPlatform } = jest.requireActual('../src/setup-metanorma');

    await installInkscapeCrossPlatform();

    expect(core.info).toHaveBeenCalledWith('Installing Inkscape via metanorma/ci/inkscape-setup-action@main (cross-platform)...');
    expect(core.info).toHaveBeenCalledWith('Inkscape installation would be handled by metanorma/ci/inkscape-setup-action@main');
    expect(core.info).toHaveBeenCalledWith('This action is cross-platform and works on Linux, macOS, and Windows');
  });


  it('should update Fontist successfully', async () => {
    const mockExec = exec.exec as jest.Mock;

    // Mock environment checks - all available
    mockExec
      .mockResolvedValueOnce(0) // ruby check
      .mockResolvedValueOnce(0) // bundle check
      .mockResolvedValueOnce(0) // inkscape check
      .mockResolvedValueOnce(0) // metanorma check
      .mockResolvedValueOnce(0); // fontist update

    const { setupRubyEnvironment } = jest.requireActual('../src/setup-metanorma');

    const result = await setupRubyEnvironment();

    expect(result).toBe('3.3');
    expect(mockExec).toHaveBeenCalledWith('bundle', ['exec', 'fontist', 'update']);
    expect(core.info).toHaveBeenCalledWith('Updating Fontist via bundler...');
  });

  it('should continue when Fontist update fails', async () => {
    const mockExec = exec.exec as jest.Mock;

    // Mock environment checks - all available, but fontist update fails
    mockExec
      .mockResolvedValueOnce(0) // ruby check
      .mockResolvedValueOnce(0) // bundle check
      .mockResolvedValueOnce(0) // inkscape check
      .mockResolvedValueOnce(0) // metanorma check
      .mockRejectedValueOnce(new Error('Fontist update failed')); // fontist update fails

    const { setupRubyEnvironment } = jest.requireActual('../src/setup-metanorma');

    const result = await setupRubyEnvironment();

    expect(result).toBe('3.3');
    expect(core.warning).toHaveBeenCalledWith('Failed to update Fontist: Fontist update failed');
    expect(core.warning).toHaveBeenCalledWith('Continuing with installation...');
  });
});
