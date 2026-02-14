import {info, debug, warning, setFailed, setOutput} from '@actions/core';
import {exec} from '@actions/exec';
import {getInputs} from './input-helper.js';
import {InstallerFactory} from './installers/installer-factory.js';
import type {IMetanormaSettings} from './metanorma-settings.js';
import {
  IsPost,
  saveTempFile,
  saveTempFiles,
  clearTempFiles,
  saveInstallPath,
  getInstallPath
} from './state-helper.js';
import {getVersionStore} from './version/index.js';
import type {VersionDataStore} from './version/index.js';
import {IdempotencyManager} from './idempotency/index.js';

async function run(): Promise<void> {
  let versionStore: VersionDataStore | null = null;
  const idempotency = new IdempotencyManager();

  try {
    // Initialize version store to get version data from mnenv
    // This is best-effort - if it fails, we'll fall back to existing behavior
    versionStore = await getVersionStore();

    if (versionStore) {
      info('Version store initialized successfully');
    } else {
      info(
        'Version store not available (mnenv CLI or prerequisites missing), using fallback behavior'
      );
    }

    // Get inputs
    const settings = await getInputs();

    // Check for idempotency (skip if already installed with same config)
    const idempotencyResult =
      await idempotency.checkAndSkipIfAlreadyInstalled(settings);

    if (idempotencyResult.shouldSkip) {
      info(`✓ ${idempotencyResult.details}`);
      // Still set outputs for downstream actions
      setOutputs(settings, idempotencyResult.installedVersion);
      return;
    }

    info(idempotencyResult.details || 'Proceeding with installation...');

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

    info('✓ Metanorma installation completed successfully');
  } catch (error) {
    setFailed(`${(error as Error)?.message ?? error}`);
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
    warning(`${(error as Error)?.message ?? error}`);
  }
}

async function getMetanormaVersion(): Promise<string | null> {
  try {
    let stdout = '';

    await exec('metanorma', ['--version'], {
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
  setOutput('version', installedVersion || settings.version || 'latest');
  setOutput('platform', settings.platform);
  setOutput('installation-method', settings.installationMethod);
  setOutput('idempotent', String(!!installedVersion));
}

// Main entry point - use async IIFE to ensure proper awaiting
(async (): Promise<void> => {
  try {
    if (!IsPost) {
      await run();
    } else {
      await cleanup();
    }
  } catch (error) {
    setFailed(`Unhandled error: ${(error as Error)?.message ?? error}`);
  }
})();
