import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as path from 'path';

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

export async function installMetanormaVersion(version: string | null) {
  let toolPath: string = '/usr/bin/metanorma';

  if (IS_MACOSX) {
    let formulaUrl: string = `https://raw.githubusercontent.com/metanorma/homebrew-metanorma/v${version}/Formula/metanorma.rb`;
    if (version == null) {
      formulaUrl = `https://raw.githubusercontent.com/metanorma/homebrew-metanorma/master/Formula/metanorma.rb`;
    }
    exec.exec(`brew install --HEAD ${formulaUrl}`);
    toolPath = '/usr/local/bin/metanorma';
  } else if (IS_LINUX) {
    // TODO support version
    exec.exec(
      `curl -L https://raw.githubusercontent.com/metanorma/metanorma-linux-setup/master/ubuntu.sh | sudo bash`
    );
    toolPath = '/usr/bin/metanorma';
  } else if (IS_WINDOWS) {
    if (version == null) {
      exec.exec('choco install -y metanorma');
    } else {
      exec.exec(`choco install -y metanorma --version ${version}`);
    }
    toolPath = `${process.env.ChocolateyPackageFolder}\\metanorma`;
  }

  core.addPath(toolPath);
}
