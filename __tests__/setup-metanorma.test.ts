import * as io from '@actions/io';
import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as path from 'path';
import fetch from 'node-fetch';

jest.mock('@actions/exec');
jest.mock('@actions/core');
jest.mock('node-fetch', () =>
  jest.fn(() => {
    return new Promise((resolve, reject) => {
      process.nextTick(() => {
        resolve({
          body: {
            pipe: jest.fn(fs => fs.close()),
            on: jest.fn()
          }
        });
      });
    });
  })
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

describe('find-ruby', () => {
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

  it('install metanorma with version 1.2.3', async () => {
    await installMetanormaVersion('1.2.3', 'stable', false);

    let cmd: string | null = null;
    if (IS_MACOSX) {
      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/metanorma/homebrew-metanorma/' +
          'v1.2.3/Formula/metanorma.rb'
      );
      cmd = 'brew install --formula metanorma.rb';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma --channel=1.2.3/stable --classic';
    } else if (IS_WINDOWS) {
      cmd = 'choco install metanorma --yes --no-progress --version 1.2.3';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    expect(exec.exec).toHaveReturnedWith(Promise.resolve(0));
    expect(core.addPath).not.toBeCalled();
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
    expect(core.addPath).not.toBeCalled();
  });

  it('install metanorma snap edge channel', async () => {
    await installMetanormaVersion('3.2.1', 'edge', true);

    let cmd: string | null = null;
    if (IS_MACOSX) {
      cmd = 'brew install --formula metanorma.rb';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma --channel=3.2.1/edge --classic';
    } else if (IS_WINDOWS) {
      cmd =
        'choco install metanorma --yes --no-progress --pre --version 3.2.1-pre';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd, [], expect.anything());
    expect(exec.exec).toHaveReturnedWith(Promise.resolve(0));
    expect(core.addPath).not.toBeCalled();
  });
});
