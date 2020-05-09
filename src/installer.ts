import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as path from 'path';

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

export async function installMetanormaVersion(version: string) {
  const installDir: string | null = tc.find('Ruby', version);

  if (!installDir) {
    throw new Error(`Version ${version} not found`);
  }

  const toolPath: string = path.join(installDir, 'bin');
  const version: string = 'master';

  if (IS_MACOSX) {
    const formulaUrl: string = `https://raw.githubusercontent.com/metanorma/homebrew-metanorma/${version}/Formula/metanorma.rb`
    exec.exec(`brew install --HEAD ${formulaUrl}`);
  } else if (IS_LINUX) {
    exec.exec(`curl -L https://raw.githubusercontent.com/metanorma/metanorma-linux-setup/master/ubuntu.sh | sudo bash`);
  } else if (IS_WINDOWS) {
    exec.exec(`choco install -y metanorma`);
  }

  core.addPath(toolPath);
}
