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
    res.body.pipe(fileStream);
    res.body.on('error', err => {
      reject(err);
    });
    fileStream.on('finish', function() {
      resolve();
    });
  });
}

export async function installMetanormaVersion(version: string | null) {
  let toolPath: string = '/usr/bin/metanorma';

  let revision: string = 'master';
  if (version != null) {
    revision = `v${version}`;
  }

  let cmd: string | null = null;
  if (IS_MACOSX) {
    let formulaUrl: string = `https://raw.githubusercontent.com/metanorma/homebrew-metanorma/${revision}/Formula/metanorma.rb`;
    cmd = `brew install --HEAD ${formulaUrl}`;
    toolPath = '/usr/local/bin/metanorma';
  } else if (IS_LINUX) {
    let script: string = './ubuntu.sh';
    await download(
      `https://raw.githubusercontent.com/metanorma/metanorma-linux-setup/${revision}/ubuntu.sh`,
      script
    );
    cmd = `sudo bash ${script}`;
    toolPath = '/usr/bin/metanorma';
  } else if (IS_WINDOWS) {
    if (version == null) {
      cmd = 'choco install -y metanorma';
    } else {
      cmd = `choco install -y metanorma --version ${version}`;
    }
    toolPath = `${process.env.ChocolateyPackageFolder}\\metanorma`;
  }

  if (cmd != null) {
    await exec.exec(cmd);
    core.addPath(toolPath);
  } else {
    throw new Error(`Unsupported platform ${process.platform}`);
  }
}
