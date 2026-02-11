import * as core from '@actions/core';
import * as coreCommand from '@actions/core/lib/command';
import * as path from 'path';
import {getInputs} from './input-helper';
import {InstallerFactory} from './installers/installer-factory';
import {IMetanormaSettings} from './metanorma-settings';
import * as stateHelper from './state-helper';
import {getVersionStore, VersionDataStore} from './version';

async function run(): Promise<void> {
  let versionStore: VersionDataStore | null = null;
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

    // Create and use installer
    const installer = InstallerFactory.createInstaller(
      settings.platform,
      settings.installationMethod,
      settings
    );

    // Install Metanorma
    await installer.install(settings);

    // Set outputs if supported by the action
    setOutputs(settings);

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
  } catch (error) {
    core.warning(`${(error as any)?.message ?? error}`);
  }
}

function setOutputs(settings: IMetanormaSettings): void {
  // Set outputs for downstream actions
  core.setOutput('version', settings.version || 'latest');
  core.setOutput('platform', settings.platform);
  core.setOutput('installation-method', settings.installationMethod);
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
