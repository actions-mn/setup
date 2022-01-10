import * as core from '@actions/core';
import {installMetanormaVersion} from './installer';

async function run() {
  try {
    let version = core.getInput('version');
    let snap_channel = core.getInput('snap-channel');
    let choco_prerelase = core.getInput('choco-prerelase') === 'true';
    await installMetanormaVersion(version, snap_channel, choco_prerelase);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
