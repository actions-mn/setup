import {IMetanormaSettings} from '../metanorma-settings';
import {BaseInstaller} from './base-installer';
import {saveTempFile} from '../state-helper';
import * as core from '@actions/core';

/**
 * macOS Homebrew installer
 * Installs Metanorma using Homebrew package manager
 */
export class BrewInstaller extends BaseInstaller {
  private formulaPath = 'metanorma.rb';
  private localTap = 'actions-mn/setup';

  async install(settings: IMetanormaSettings): Promise<void> {
    core.startGroup('Installing Metanorma via Homebrew');

    try {
      let command = 'brew';
      let args: string[] = ['install'];

      if (settings.version) {
        // For versioned installs, tap at a specific version
        const tapDir = '/opt/homebrew/Library/Taps/metanorma/homebrew-metanorma';

        // Ensure tap exists
        await this.execCommand('brew', ['tap', 'metanorma/metanorma'], {
          silent: true,
          ignoreReturnCode: true
        });

        // Checkout the specific version tag
        await this.execCommand('git', ['checkout', `v${settings.version}`], {
          cwd: tapDir,
          silent: true,
          ignoreReturnCode: true
        });

        // Update brew to pick up the changes
        await this.execCommand('brew', ['update', 'metanorma/metanorma'], {
          silent: true,
          ignoreReturnCode: true
        });

        args.push('metanorma/metanorma/metanorma');
      } else {
        // Install latest from tap
        args.push('metanorma/metanorma/metanorma');
      }

      core.info(`Installing Metanorma${settings.version ? ` version ${settings.version}` : ' latest'}...`);
      const exitCode = await this.execCommand(command, args);

      if (exitCode !== 0) {
        throw new Error(`Homebrew installation failed with exit code ${exitCode}`);
      }

      core.info('✓ Metanorma installed successfully via Homebrew');
    } finally {
      core.endGroup();
    }
  }

  async cleanup(): Promise<void> {
    core.startGroup('Cleaning up Homebrew installation');

    try {
      // Untap the local tap if it exists
      await this.execCommand('brew', ['untap', this.localTap], {
        silent: true,
        ignoreReturnCode: true
      });

      core.info('✓ Cleanup completed');
    } finally {
      core.endGroup();
    }
  }
}
