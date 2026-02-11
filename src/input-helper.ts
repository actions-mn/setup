import * as core from '@actions/core';
import {
  detectPlatform,
  Platform,
  InstallationMethod
} from './platform-detector';
import {IMetanormaSettings} from './metanorma-settings';
import {getInstallationMethod, detectContainer} from './container-detector';

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

  // Installation method input
  const installationMethodInput =
    core.getInput('installation-method') || 'auto';
  const {method: detectedMethod, reason} = await getInstallationMethod(
    installationMethodInput
  );
  result.installationMethod = detectedMethod as InstallationMethod;
  core.info(`Installation method: ${result.installationMethod} (${reason})`);

  // Bundler version (for gem-based installation)
  const bundlerVersionInput = core.getInput('bundler-version');
  result.bundlerVersion = bundlerVersionInput || '2.6.5';
  core.debug(`bundlerVersion = '${result.bundlerVersion}'`);

  // Custom Gemfile (for gem-based installation)
  const gemfileInput = core.getInput('gemfile');
  result.gemfile = gemfileInput || undefined;
  if (result.gemfile) {
    core.debug(`gemfile = '${result.gemfile}'`);
  }

  // Fontist update (for gem-based installation)
  const fontistUpdateInput = core.getInput('fontist-update');
  result.fontistUpdate =
    (fontistUpdateInput || 'true').toUpperCase() === 'TRUE';
  core.debug(`fontistUpdate = ${result.fontistUpdate}`);

  // Bundle update (for gem-based installation)
  const bundleUpdateInput = core.getInput('bundle-update');
  result.bundleUpdate = (bundleUpdateInput || 'false').toUpperCase() === 'TRUE';
  core.debug(`bundleUpdate = ${result.bundleUpdate}`);

  // Use pre-built locks (for gem-based installation)
  const usePrebuiltLocksInput = core.getInput('use-prebuilt-locks');
  result.usePrebuiltLocks =
    (usePrebuiltLocksInput || 'true').toUpperCase() !== 'FALSE';
  core.debug(`usePrebuiltLocks = ${result.usePrebuiltLocks}`);

  // Container detection (Linux only)
  if (result.platform === Platform.Linux) {
    result.containerInfo = await detectContainer();
    core.debug(`containerInfo = ${JSON.stringify(result.containerInfo)}`);
  }

  return result;
}
