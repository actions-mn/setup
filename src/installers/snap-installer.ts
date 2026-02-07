import {IMetanormaSettings} from '../metanorma-settings';
import {BaseInstaller} from './base-installer';
import * as core from '@actions/core';

/**
 * Linux Snap installer
 * Installs Metanorma using Snap package manager
 */
export class SnapInstaller extends BaseInstaller {
  async install(settings: IMetanormaSettings): Promise<void> {
    core.startGroup('Installing Metanorma via Snap');

    try {
      // Try to install metanorma directly
      let args: string[] = ['snap', 'install', 'metanorma'];

      if (settings.version) {
        const channel = `${settings.version}/${settings.snapChannel}`;
        core.info(`Installing Metanorma version ${settings.version} from ${settings.snapChannel} channel...`);
        args.push(`--channel=${channel}`, '--classic');
      } else {
        core.info('Installing Metanorma latest from stable channel...');
        args.push('--classic');
      }

      const exitCode = await this.execCommand('sudo', args);

      if (exitCode !== 0) {
        throw new Error(`Snap installation failed with exit code ${exitCode}`);
      }

      core.info('✓ Metanorma installed successfully via Snap');
    } finally {
      core.endGroup();
    }
  }

  async cleanup(): Promise<void> {
    // Snap doesn't require cleanup
    core.debug('Snap installer: No cleanup needed');
  }
}
