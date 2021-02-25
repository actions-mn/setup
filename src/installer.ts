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
    cmd = 'brew install metanorma/metanorma/metanorma';
  } else if (IS_LINUX) {
    cmd = 'sudo snap install metanorma';
  } else if (IS_WINDOWS) {
    if (version && version !== '') {
      cmd = `choco install metanorma --yes --version ${version}`;
    } else {
      cmd = 'choco install metanorma --yes';
    }

    let chocoTools: string =
      process.env['ChocolateyToolsLocation'] || 'c:\\tools';

    core.addPath(`${chocoTools}\\ruby25\\bin`);
  }

  if (cmd) {
    await exec.exec(cmd);
  } else {
    throw new Error(`Unsupported platform ${process.platform}`);
  }
}
