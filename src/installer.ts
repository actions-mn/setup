import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

async function download(url: string, path: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error('Missing body in response');
  }

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(path, new Uint8Array(buffer));
}

async function installMetanormaWithBrew(version: string | null): Promise<void> {
  core.info('Installing Metanorma via Homebrew');

  const cmd = ['brew', 'install'];

  if (version) {
    const formulaUrl =
      'https://raw.githubusercontent.com/metanorma/homebrew-metanorma/' +
      `v${version}/Formula/metanorma.rb`;

    core.info(`Downloading Homebrew formula for version ${version}`);
    await download(formulaUrl, 'metanorma.rb');
    cmd.push('--formula', 'metanorma.rb');
  } else {
    cmd.push('metanorma/metanorma/metanorma');
  }

  const statusCode = await exec.exec(cmd.join(' '), [], {});
  if (statusCode !== 0) {
    throw new Error(`Homebrew installation failed with exit code ${statusCode}`);
  }
}

async function installMetanormaWithSnap(
  version: string | null,
  snapChannel: string
): Promise<void> {
  core.info('Installing Metanorma via Snap');

  // Check if sudo is available (containers might not have it)
  const hasSudo = await checkCommandExists('sudo');

  const cmd = hasSudo ? ['sudo', 'snap', 'install', 'metanorma'] : ['snap', 'install', 'metanorma'];

  if (version) {
    cmd.push(`--channel=${version}/${snapChannel}`, '--classic');
  }

  const statusCode = await exec.exec(cmd.join(' '), [], {});
  if (statusCode !== 0) {
    if (!hasSudo) {
      throw new Error(`Snap installation failed with exit code ${statusCode}. Container environment detected - ensure snap is available and has proper permissions.`);
    } else {
      throw new Error(`Snap installation failed with exit code ${statusCode}`);
    }
  }
}

async function checkCommandExists(command: string): Promise<boolean> {
  try {
    const cmd = IS_WINDOWS ? 'where' : 'which';
    await exec.exec(cmd, [command], { silent: true });
    return true;
  } catch {
    return false;
  }
}

async function installMetanormaWithChocolatey(
  version: string | null,
  allowPrerelease: boolean
): Promise<void> {
  core.info('Installing Metanorma via Chocolatey');

  const cmd = ['choco', 'install', 'metanorma', '--yes', '--no-progress'];
  let ignoreFailure = false;

  if (allowPrerelease) {
    cmd.push('--pre');
  }

  if (version) {
    cmd.push('--version');
    if (allowPrerelease) {
      cmd.push(`${version}-pre`);
    } else {
      cmd.push(version);
    }
  }

  const options: exec.ExecOptions = {
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: any) => {
        if (!ignoreFailure) {
          ignoreFailure = data.toString().includes(' - git.install (exited 1)');
        }
      }
    }
  };

  const statusCode = await exec.exec(cmd.join(' '), [], options);
  if (statusCode !== 0 && !ignoreFailure) {
    throw new Error(`Chocolatey installation failed with exit code ${statusCode}`);
  }
}

export async function installMetanormaVersion(
  version: string,
  snap_channel: string,
  choco_prerelease: boolean
): Promise<void> {
  // Handle empty string as null for backward compatibility
  const targetVersion = version && version.trim() !== '' ? version.trim() : null;

  core.info(`Installing Metanorma${targetVersion ? ` version ${targetVersion}` : ' (latest)'} on ${process.platform}`);

  if (IS_MACOSX) {
    await installMetanormaWithBrew(targetVersion);
  } else if (IS_LINUX) {
    await installMetanormaWithSnap(targetVersion, snap_channel);
  } else if (IS_WINDOWS) {
    await installMetanormaWithChocolatey(targetVersion, choco_prerelease);
  } else {
    throw new Error(`Unsupported platform ${process.platform}`);
  }

  core.info('Metanorma installation completed successfully');
}
