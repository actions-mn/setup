import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';
import fetch from 'node-fetch';

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

async function download(url: string, path: string) {
  console.log(`url: ${url}`);
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
  let cmd: string | null = null;
  if (IS_MACOSX) {
    let revision: string = 'master';
    if (version && version !== '') {
      revision = `v${version}`;
    }
    let formulaUrl: string = `https://raw.githubusercontent.com/metanorma/homebrew-metanorma/${revision}/Formula/metanorma.rb`;
    cmd = `brew install --HEAD ${formulaUrl}`;
  } else if (IS_LINUX) {
    let scriptFile: string = './ubuntu.sh';
    let scriptUrl: string = `https://raw.githubusercontent.com/metanorma/metanorma-linux-setup/master/ubuntu.sh`;
    await download(scriptUrl, scriptFile);
    await exec.exec('sudo apt-get update -y');
    await exec.exec(`sudo bash ${scriptFile}`);
    if (version && version !== '') {
      cmd = `sudo gem install rake metanorma-cli:${version}`;
    } else {
      cmd = 'sudo gem install rake metanorma-cli';
    }
  } else if (IS_WINDOWS) {
    if (version && version !== '') {
      cmd = `choco install metanorma --yes --version ${version}`;
    } else {
      cmd = 'choco install metanorma --yes';
    }
    core.addPath(`${process.env.ChocolateyToolsLocation}\\ruby25\\bin`);
  }

  if (cmd) {
    await exec.exec(cmd);
  } else {
    throw new Error(`Unsupported platform ${process.platform}`);
  }
}
