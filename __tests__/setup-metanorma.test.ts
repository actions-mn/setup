import {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
  Mock,
  expect
} from 'vitest';
import * as io from '@actions/io';
import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

vi.mock('@actions/exec');
vi.mock('@actions/core');
vi.mock('node-fetch', () => ({
  default: vi.fn(() => {
    return new Promise(resolve => {
      process.nextTick(() => {
        resolve({
          body: {
            pipe: vi.fn((ws: any) => {
              setImmediate(() => {
                if (ws.emit) ws.emit('finish');
                if (ws.on) {
                  // Call any 'finish' event listeners
                  const listeners = ws.on?.mock?.calls?.filter(
                    (call: any[]) => call[0] === 'finish'
                  );
                  if (listeners) {
                    listeners.forEach((call: any[]) => call[1]());
                  }
                }
                if (ws.close) ws.close();
              });
            }),
            on: vi.fn()
          }
        });
      });
    });
  })
}));

// Mock fs.createWriteStream to avoid actual file operations
vi.mock('fs', async () => {
  const actualFs = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    createWriteStream: vi.fn(() => ({
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn((event: string, callback: any) => {
        if (event === 'finish') setImmediate(() => callback());
      }),
      emit: vi.fn(),
      close: vi.fn()
    })),
    existsSync: vi.fn(() => false),
    unlinkSync: vi.fn()
  };
});

const toolDir = path.join(__dirname, 'runner', 'tools');
const tempDir = path.join(__dirname, 'runner', 'temp');

process.env['AGENT_TOOLSDIRECTORY'] = toolDir;
process.env['RUNNER_TOOL_CACHE'] = toolDir;
process.env['RUNNER_TEMP'] = tempDir;

import {installMetanormaVersion} from '../src/installer';

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

describe('find-ruby', () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
    (exec.exec as unknown as Mock).mockResolvedValue(0);
  });

  // Clear mock before each test to avoid accumulating calls
  beforeEach(() => {
    (exec.exec as unknown as Mock).mockClear();
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
    await installMetanormaVersion(null, 'stable', false);
    let cmd: string | null = null;
    if (IS_MACOSX) {
      cmd = 'brew install metanorma/metanorma/metanorma';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma';
    } else if (IS_WINDOWS) {
      cmd = 'choco install metanorma --yes --no-progress';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    expect(core.addPath).not.toHaveBeenCalled();
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
    expect(core.addPath).not.toHaveBeenCalled();
  });

  it('install metanorma with version 1.2.3', async () => {
    await installMetanormaVersion('1.2.3', 'stable', false);

    let cmd: string | null = null;
    if (IS_MACOSX) {
      expect(fetch).not.toHaveBeenCalled(); // No longer downloading formula file
      // The new approach uses git checkout in the tap directory
      // Check that brew install is called with the tap
      const calls = (exec.exec as unknown as Mock).mock.calls;
      // Find a call that includes git checkout
      const gitCheckoutCall = calls.find(
        call => call[0]?.includes('git') && call[1]?.includes('checkout')
      );
      expect(gitCheckoutCall).toBeTruthy();
      expect(gitCheckoutCall?.[1]).toContain('v1.2.3');
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma --channel=1.2.3/stable --classic';
    } else if (IS_WINDOWS) {
      cmd = 'choco install metanorma --yes --no-progress --version 1.2.3';
    }
    if (IS_LINUX || IS_WINDOWS) {
      expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    }
    expect(exec.exec).toHaveReturnedWith(Promise.resolve(0));
    expect(core.addPath).not.toHaveBeenCalled();
  });

  it('install metanorma allow --pre', async () => {
    await installMetanormaVersion(null, 'stable', true);

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
    expect(core.addPath).not.toHaveBeenCalled();
  });

  it('install metanorma snap edge channel', async () => {
    await installMetanormaVersion('3.2.1', 'edge', true);

    let cmd: string | null = null;
    if (IS_MACOSX) {
      // The new approach uses git checkout in the tap directory
      const calls = (exec.exec as unknown as Mock).mock.calls;
      // Find a call that includes git checkout
      const gitCheckoutCall = calls.find(
        call => call[0]?.includes('git') && call[1]?.includes('checkout')
      );
      expect(gitCheckoutCall).toBeTruthy();
      expect(gitCheckoutCall?.[1]).toContain('v3.2.1');
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma --channel=3.2.1/edge --classic';
    } else if (IS_WINDOWS) {
      cmd =
        'choco install metanorma --yes --no-progress --pre --version 3.2.1-pre';
    }
    if (IS_LINUX || IS_WINDOWS) {
      expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    }
    expect(exec.exec).toHaveReturnedWith(Promise.resolve(0));
    expect(core.addPath).not.toHaveBeenCalled();
  });
});
