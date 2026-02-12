import * as core from '@actions/core';
import * as coreCommand from '@actions/core/lib/command';
import * as path from 'path';
import * as exec from '@actions/exec';
import {getInputs} from './input-helper';
import {InstallerFactory} from './installers/installer-factory';
import {IMetanormaSettings} from './metanorma-settings';
import * as stateHelper from './state-helper';
import {getVersionStore, VersionDataStore} from './version';
import {IdempotencyManager} from './idempotency';

async function run(): Promise<void> {
  let versionStore: VersionDataStore | null = null;
  const idempotency = new IdempotencyManager();

  try {
    // Initialize version store to get version data from mnenv
    // This is best-effort - if it fails, we'll fall back to existing behavior
    versionStore = await getVersionStore();

    if (versionStore) {
      core.info('Version store initialized successfully');
    } else {
      core.info(
        'Version store not available (mnenv CLI or prerequisites missing), using fallback behavior'
      );
    }

    // Get inputs
    const settings = await getInputs();

    // Check for idempotency (skip if already installed with same config)
    const idempotencyResult =
      await idempotency.checkAndSkipIfAlreadyInstalled(settings);

    if (idempotencyResult.shouldSkip) {
      core.info(`✓ ${idempotencyResult.details}`);
      // Still set outputs for downstream actions
      setOutputs(settings, idempotencyResult.installedVersion);
      return;
    }

    core.info(idempotencyResult.details || 'Proceeding with installation...');

    // Create and use installer
    const installer = InstallerFactory.createInstaller(
      settings.platform,
      settings.installationMethod,
      settings
    );

    // Install Metanorma
    await installer.install(settings);

    // Save installation state for idempotency
    const installedVersion = await getMetanormaVersion();
    await idempotency.saveInstallationState(settings, installedVersion);

    // Set outputs if supported by the action
    setOutputs(settings, installedVersion);

    core.info('✓ Metanorma installation completed successfully');
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`);
  }
}

async function cleanup(): Promise<void> {
  try {
    // Get inputs to determine platform and installation method
    const settings = await getInputs();
    const installer = InstallerFactory.createInstaller(
      settings.platform,
      settings.installationMethod,
      settings
    );
    await installer.cleanup();

    // Also clear idempotency state on cleanup
    const idempotency = new IdempotencyManager();
    await idempotency.clearState();
  } catch (error) {
    core.warning(`${(error as any)?.message ?? error}`);
  }
}

async function getMetanormaVersion(): Promise<string | null> {
  try {
    let stdout = '';

    await exec.exec('metanorma', ['--version'], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        }
      }
    });

    // Parse version from output (typically "metanorma version X.Y.Z")
    const match = stdout.match(/metanorma\s+version\s+v?(\d+\.\d+\.\d+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function setOutputs(
  settings: IMetanormaSettings,
  installedVersion?: string | null
): void {
  // Set outputs for downstream actions
  core.setOutput('version', installedVersion || settings.version || 'latest');
  core.setOutput('platform', settings.platform);
  core.setOutput('installation-method', settings.installationMethod);
  core.setOutput('idempotent', String(!!installedVersion));
}

// Main entry point - use async IIFE to ensure proper awaiting
(async (): Promise<void> => {
  try {
    if (!stateHelper.IsPost) {
      await run();
    } else {
      await cleanup();
    }
  } catch (error) {
    core.setFailed(`Unhandled error: ${(error as any)?.message ?? error}`);
  }
})();
