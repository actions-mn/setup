import * as core from '@actions/core';
import {findMetanormaVersion} from './installer';

async function run() {
  try {
    let version = core.getInput('version');
    await installMetanormaVersion(version);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
