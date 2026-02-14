import {getInput, setFailed} from '@actions/core';
import {installMetanormaVersion} from './installer.js';

async function run() {
  try {
    let version = getInput('version');
    let snap_channel = getInput('snap-channel');
    let choco_prerelase = getInput('choco-prerelase') === 'true';
    await installMetanormaVersion(version, snap_channel, choco_prerelase);
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
