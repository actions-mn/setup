import * as io from '@actions/io';
import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as path from 'path';

jest.mock('@actions/exec');
jest.mock('@actions/core');

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
    await installMetanormaVersion(null);

    let cmd: string | null = null;
    if (IS_MACOSX) {
      cmd = 'brew install metanorma/metanorma/metanorma';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma';
    } else if (IS_WINDOWS) {
      cmd = 'choco install metanorma --yes --no-progress';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd);
    expect(core.addPath).not.toBeCalled();
  });

  it('install metanorma with "" version', async () => {
    await installMetanormaVersion('');

    let cmd: string | null = null;
    if (IS_MACOSX) {
      cmd = 'brew install metanorma/metanorma/metanorma';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma';
    } else if (IS_WINDOWS) {
      cmd = 'choco install metanorma --yes --no-progress';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd);
    expect(core.addPath).not.toBeCalled();
  });

  it('install metanorma with version 1.2.3', async () => {
    await installMetanormaVersion('1.2.3');

    let cmd: string | null = null;
    if (IS_MACOSX) {
      cmd = 'brew install metanorma/metanorma/metanorma';
    } else if (IS_LINUX) {
      cmd = 'sudo snap install metanorma';
    } else if (IS_WINDOWS) {
      cmd = 'choco install metanorma --yes --no-progress --version 1.2.3';
    }
    expect(exec.exec).toHaveBeenCalledWith(cmd);
    expect(core.addPath).not.toBeCalled();
  });

  // TODO add more tests
});
