import {getInput, debug, info} from '@actions/core';
import {
  detectPlatform,
  Platform,
  InstallationMethod
} from './platform-detector.js';
import type {IMetanormaSettings} from './metanorma-settings.js';
import {getInstallationMethod, detectContainer} from './container-detector.js';

// Semver regex pattern for validating version input
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

/**
 * Validate that a version string is a valid semver format
 * This prevents command injection attacks when version is used in shell commands
 */
function isValidVersion(version: string): boolean {
  return SEMVER_REGEX.test(version);
}

/**
 * Get and validate all inputs
 */
export async function getInputs(): Promise<IMetanormaSettings> {
  const result = {} as IMetanormaSettings;

  // Version input
  const versionInput = getInput('version');
  result.version = versionInput || null;
  debug(`version = '${result.version}'`);

  // Validate version format to prevent command injection
  if (result.version && !isValidVersion(result.version)) {
    throw new Error(
      `Invalid version format '${result.version}'. ` +
        `Version must be in semver format (e.g., 1.14.0, 1.14.0-beta.1)`
    );
  }

  // Snap channel input
  result.snapChannel = getInput('snap-channel') || 'stable';
  debug(`snapChannel = '${result.snapChannel}'`);

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
  const chocoPrereleaseInput = getInput('choco-prerelase');
  result.chocoPrerelease =
    (chocoPrereleaseInput || 'false').toUpperCase() === 'TRUE';
  debug(`chocoPrerelease = ${result.chocoPrerelease}`);

  // Platform detection
  result.platform = detectPlatform();
  debug(`platform = '${result.platform}'`);

  // Installation path
  result.installPath = process.env['GITHUB_WORKSPACE'] || '/';
  debug(`installPath = '${result.installPath}'`);

  // Installation method input
  const installationMethodInput = getInput('installation-method') || 'auto';
  const {method: detectedMethod, reason} = await getInstallationMethod(
    installationMethodInput
  );
  result.installationMethod = detectedMethod as InstallationMethod;
  info(`Installation method: ${result.installationMethod} (${reason})`);

  // Bundler version (for gem-based installation)
  const bundlerVersionInput = getInput('bundler-version');
  result.bundlerVersion = bundlerVersionInput || '2.6.5';
  debug(`bundlerVersion = '${result.bundlerVersion}'`);

  // Custom Gemfile (for gem-based installation)
  const gemfileInput = getInput('gemfile');
  result.gemfile = gemfileInput || undefined;
  if (result.gemfile) {
    debug(`gemfile = '${result.gemfile}'`);
  }

  // Fontist update (for gem-based installation)
  const fontistUpdateInput = getInput('fontist-update');
  result.fontistUpdate =
    (fontistUpdateInput || 'true').toUpperCase() === 'TRUE';
  debug(`fontistUpdate = ${result.fontistUpdate}`);

  // Bundle update (for gem-based installation)
  const bundleUpdateInput = getInput('bundle-update');
  result.bundleUpdate = (bundleUpdateInput || 'false').toUpperCase() === 'TRUE';
  debug(`bundleUpdate = ${result.bundleUpdate}`);

  // Use pre-built locks (for gem-based installation)
  const usePrebuiltLocksInput = getInput('use-prebuilt-locks');
  result.usePrebuiltLocks =
    (usePrebuiltLocksInput || 'true').toUpperCase() !== 'FALSE';
  debug(`usePrebuiltLocks = ${result.usePrebuiltLocks}`);

  // Container detection (Linux only)
  if (result.platform === Platform.Linux) {
    result.containerInfo = await detectContainer();
    debug(`containerInfo = ${JSON.stringify(result.containerInfo)}`);
  }

  return result;
}
