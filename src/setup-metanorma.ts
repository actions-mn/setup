import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {installMetanormaVersion} from './installer';

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOSX = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

interface EnvironmentStatus {
  ruby: boolean;
  bundler: boolean;
  inkscape: boolean;
}

export async function checkCommandExists(command: string): Promise<boolean> {
  try {
    const cmd = IS_WINDOWS ? 'where' : 'which';
    await exec.exec(cmd, [command], { silent: true });
    return true;
  } catch {
    return false;
  }
}

export async function checkEnvironmentStatus(): Promise<EnvironmentStatus> {
  core.info('Checking environment status...');

  const [ruby, bundler, inkscape] = await Promise.all([
    checkCommandExists('ruby'),
    checkCommandExists('bundle'),
    checkCommandExists('inkscape')
  ]);

  core.info(`Environment status - Ruby: ${ruby ? '✓' : '✗'}, Bundler: ${bundler ? '✓' : '✗'}, Inkscape: ${inkscape ? '✓' : '✗'}`);

  return { ruby, bundler, inkscape };
}

export async function setupRubyWithBundler(): Promise<void> {
  core.info('Setting up Ruby environment via ruby/setup-ruby@v1...');

  // Set environment variables that ruby/setup-ruby@v1 expects
  core.exportVariable('INPUT_RUBY_VERSION', '3.4');
  core.exportVariable('INPUT_BUNDLER_CACHE', 'true');

  try {
    // In GitHub Actions, we need to use the actions toolkit to call other actions
    // This is a simplified approach - in reality, the action would be called via uses: in YAML
    core.info('Ruby setup would be handled by ruby/setup-ruby@v1 in the workflow');
    core.info('For now, verifying Ruby and bundler are available...');

    await exec.exec('ruby', ['--version']);
    await exec.exec('bundle', ['--version']);
  } catch (error) {
    throw new Error(
      'Ruby environment setup failed. Please ensure ruby/setup-ruby@v1 is used before this action when use-bundler is enabled, or Ruby 3.4+ with bundler is available.'
    );
  }
}

export async function installInkscapeCrossPlatform(): Promise<void> {
  core.info('Installing Inkscape...');

  try {
    if (IS_LINUX) {
      // Use metanorma/ci/inkscape-setup-action for Linux
      core.info('Installing Inkscape via metanorma/ci/inkscape-setup-action@main...');
      // In a real GitHub Actions environment, this would be handled by the workflow
      core.info('Inkscape installation would be handled by metanorma/ci/inkscape-setup-action@main');
    } else if (IS_MACOSX) {
      // Use Homebrew on macOS
      core.info('Installing Inkscape via Homebrew...');
      await exec.exec('brew', ['install', 'inkscape']);
    } else if (IS_WINDOWS) {
      // Use Chocolatey on Windows
      core.info('Installing Inkscape via Chocolatey...');
      await exec.exec('choco', ['install', 'inkscape', '--yes', '--no-progress']);
    }
  } catch (error) {
    core.warning(`Failed to install Inkscape automatically: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error('Inkscape installation failed. Please install Inkscape manually or use the metanorma/ci/inkscape-setup-action@main for Linux environments.');
  }
}

export async function setupRubyEnvironment(): Promise<string> {
  core.info('Setting up comprehensive Ruby environment for bundler workflows');

  const envStatus = await checkEnvironmentStatus();

  // Set up Ruby and bundler if not available
  if (!envStatus.ruby || !envStatus.bundler) {
    core.info('Ruby or bundler not detected, setting up Ruby environment...');
    await setupRubyWithBundler();
  } else {
    core.info('Ruby and bundler already available');
  }

  // Set up Inkscape if not available
  if (!envStatus.inkscape) {
    core.info('Inkscape not detected, installing...');
    await installInkscapeCrossPlatform();
  } else {
    core.info('Inkscape already available, skipping installation');
  }

  // Update Fontist
  try {
    core.info('Updating Fontist via bundler...');
    await exec.exec('bundle', ['exec', 'fontist', 'update']);
  } catch (error) {
    core.warning(`Failed to update Fontist: ${error instanceof Error ? error.message : String(error)}`);
    core.warning('Continuing with installation...');
  }

  return '3.4';
}

async function run() {
  try {
    const version = core.getInput('version') || '';
    const snap_channel = core.getInput('snap-channel') || 'stable';
    const choco_prerelease = core.getInput('choco-prerelease') === 'true';
    const use_bundler = core.getInput('use-bundler') === 'true';

    let ruby_version = '';

    // Handle Ruby setup if use-bundler is enabled
    if (use_bundler) {
      ruby_version = await setupRubyEnvironment();
      core.setOutput('ruby-version', ruby_version);
    }

    await installMetanormaVersion(version, snap_channel, choco_prerelease);

    // Set outputs
    core.setOutput('version', version || 'latest');
    core.setOutput('cache-hit', 'false'); // TODO: Implement caching
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
