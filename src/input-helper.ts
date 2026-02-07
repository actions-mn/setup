import * as core from '@actions/core';
import {detectPlatform, Platform} from './platform-detector';
import {IMetanormaSettings} from './metanorma-settings';

/**
 * Get and validate all inputs
 */
export async function getInputs(): Promise<IMetanormaSettings> {
  const result = {} as IMetanormaSettings;

  // Version input
  const versionInput = core.getInput('version');
  result.version = versionInput || null;
  core.debug(`version = '${result.version}'`);

  // Snap channel input
  result.snapChannel = core.getInput('snap-channel') || 'stable';
  core.debug(`snapChannel = '${result.snapChannel}'`);

  // Validate snap channel
  const validChannels = ['stable', 'edge', 'beta', 'candidate'];
  if (!validChannels.includes(result.snapChannel)) {
    throw new Error(
      `Invalid snap-channel '${
        result.snapChannel
      }'. Valid values: ${validChannels.join(', ')}`
    );
  }

  // Chocolatey prerelease input
  const chocoPrereleaseInput = core.getInput('choco-prerelase');
  result.chocoPrerelease =
    (chocoPrereleaseInput || 'false').toUpperCase() === 'TRUE';
  core.debug(`chocoPrerelease = ${result.chocoPrerelease}`);

  // Platform detection
  result.platform = detectPlatform();
  core.debug(`platform = '${result.platform}'`);

  // Installation path
  result.installPath = process.env['GITHUB_WORKSPACE'] || '/';
  core.debug(`installPath = '${result.installPath}'`);

  return result;
}
