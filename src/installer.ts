import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';
import fetch from 'node-fetch';

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

async function download(url: string, path: string) {
  const res = await fetch(url);
  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(path);
    if (!res.body) {
      reject("Missing body in response");
    }
    res.body.pipe(fileStream);
    res.body.on('error', err => {
      reject(err);
    });
    fileStream.on('finish', function() {
      resolve();
    });
  });
}

export async function installMetanormaVersion(
  version: string | null,
  snap_channel: string,
  choco_prerelase: boolean
) {
  let cmd: string[] = [];
  if (IS_MACOSX) {
    cmd = ['brew', 'install'];
    if (version) {
      let formulaUrl =
        'https://raw.githubusercontent.com/metanorma/homebrew-metanorma/' +
        `v${version}/Formula/metanorma.rb`;
      await download(formulaUrl, 'metanorma.rb');
      cmd.push('--formula');
      cmd.push('metanorma.rb');
    } else {
      cmd.push('metanorma/metanorma/metanorma');
    }
  } else if (IS_LINUX) {
    cmd = ['sudo', 'snap', 'install', 'metanorma'];
    if (version) {
      cmd.push(`--channel=${version}/${snap_channel}`, '--classic');
    }
  } else if (IS_WINDOWS) {
    cmd = ['choco', 'install', 'metanorma', '--yes', '--no-progress'];
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
  }

  if (cmd.length) {
    await exec.exec(cmd.join(' '));
  } else {
    throw new Error(`Unsupported platform ${process.platform}`);
  }
}
