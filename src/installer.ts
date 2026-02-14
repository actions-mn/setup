import {info, warning} from '@actions/core';
import {exec} from '@actions/exec';
import type {ExecOptions} from '@actions/exec';
import * as tc from '@actions/tool-cache';
import {createWriteStream} from 'fs';
import fetch from 'node-fetch';
import {
  validateVersion,
  getLatestVersion,
  isVersionAvailable
} from './version-validator.js';

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

async function download(url: string, path: string) {
  const res = await fetch(url);
  await new Promise<void>((resolve, reject) => {
    const fileStream = createWriteStream(path);
    if (res.body) {
      res.body.pipe(fileStream);
      res.body.on('error', err => {
        reject(err);
      });
      fileStream.on('finish', function () {
        resolve();
      });
    } else {
      reject(new Error('Missing body in response'));
    }
  });
}

export async function installMetanormaVersion(
  version: string | null,
  snap_channel: string,
  choco_prerelase: boolean
) {
  // Determine the installation method based on platform
  let installMethod: 'snap' | 'chocolatey' | 'homebrew' | null = null;
  if (IS_MACOSX) {
    installMethod = 'homebrew';
  } else if (IS_LINUX) {
    installMethod = 'snap';
  } else if (IS_WINDOWS) {
    installMethod = 'chocolatey';
  }

  // Validate version availability if we have versions.json
  if (installMethod && version && version !== 'latest') {
    validateVersion(version, installMethod);
  }

  let cmds: string[] = [];
  let options: ExecOptions = {};
  let ignoreFailure: boolean = false;

  if (IS_MACOSX) {
    let cmd = ['brew', 'install'];
    if (version) {
      const tapDir = '/opt/homebrew/Library/Taps/metanorma/homebrew-metanorma';

      // Ensure tap exists
      await exec('brew', ['tap', 'metanorma/metanorma'], {
        silent: true,
        ignoreReturnCode: true
      });

      // Checkout the specific version tag
      await exec('git', ['checkout', `v${version}`], {
        cwd: tapDir,
        silent: true,
        ignoreReturnCode: true
      });

      // Update brew to pick up the changes
      await exec('brew', ['update', 'metanorma/metanorma'], {
        silent: true,
        ignoreReturnCode: true
      });

      cmd.push('metanorma/metanorma/metanorma');
    } else {
      cmd.push('metanorma/metanorma/metanorma');
    }
    cmds.push(cmd.join(' '));
  } else if (IS_LINUX) {
    let cmd = ['sudo', 'snap', 'install', 'metanorma'];
    if (version) {
      cmd.push(`--channel=${version}/${snap_channel}`, '--classic');
    }
    cmds.push(cmd.join(' '));
  } else if (IS_WINDOWS) {
    let cmd = ['choco', 'install', 'metanorma', '--yes', '--no-progress'];
    if (choco_prerelase) {
      cmd.push('--pre');
    }
    if (version) {
      cmd.push('--version');
      if (choco_prerelase) {
        cmd.push(`${version}-pre`);
      } else {
        cmd.push(version);
      }
    }

    options.ignoreReturnCode = true;
    options.listeners = {
      stdout: (data: Buffer) => {
        if (!ignoreFailure) {
          ignoreFailure = data.toString().includes(' - git.install (exited 1)');
        }
      }
    };

    // workaround for 3.10-3.11 installation issues
    cmds.push('choco install python3 --version 3.9.13 --yes --no-progress');
    cmds.push(cmd.join(' '));
  }

  if (cmds.length) {
    for (const cmd of cmds) {
      let statusCode = await exec(cmd, [], options);
      if (statusCode != 0 && !ignoreFailure) {
        throw new Error(`Command ${cmd} failed with exit code ${statusCode}`);
      }
    }
  } else {
    throw new Error(`Unsupported platform ${process.platform}`);
  }
}
