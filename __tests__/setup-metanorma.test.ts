import * as io from '@actions/io';
import * as exec from '@actions/exec';
import * as path from 'path';

jest.mock('@actions/exec');

const toolDir = path.join(__dirname, 'runner', 'tools');
const tempDir = path.join(__dirname, 'runner', 'temp');

process.env['AGENT_TOOLSDIRECTORY'] = toolDir;
process.env['RUNNER_TOOL_CACHE'] = toolDir;
process.env['RUNNER_TEMP'] = tempDir;

import {installMetanormaVersion} from '../src/installer';

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

  it('install metanorma with no version', async () => {
    await installMetanormaVersion(null);
    expect(exec.exec).toHaveBeenCalled();
  });

  // TODO add more tests
});
