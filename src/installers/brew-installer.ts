import type {IMetanormaSettings} from '../metanorma-settings.js';
import {BaseInstaller} from './base-installer.js';
import {saveTempFile} from '../state-helper.js';
import {startGroup, endGroup, info, debug} from '@actions/core';

/**
 * macOS Homebrew installer
 * Installs Metanorma using Homebrew package manager
 */
export class BrewInstaller extends BaseInstaller {
  private formulaPath = 'metanorma.rb';
  private localTap = 'actions-mn/setup';

  async install(settings: IMetanormaSettings): Promise<void> {
    startGroup('Installing Metanorma via Homebrew');

    try {
      let command = 'brew';
      let args: string[] = ['install'];

      if (settings.version) {
        // For versioned installs, tap at a specific version
        const tapDir =
          '/opt/homebrew/Library/Taps/metanorma/homebrew-metanorma';

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

      info(
        `Installing Metanorma${settings.version ? ` version ${settings.version}` : ' latest'}...`
      );
      const exitCode = await this.execCommand(command, args);

      if (exitCode !== 0) {
        throw new Error(
          `Homebrew installation failed with exit code ${exitCode}`
        );
      }

      info('✓ Metanorma installed successfully via Homebrew');
    } finally {
      endGroup();
    }
  }

  async cleanup(): Promise<void> {
    startGroup('Cleaning up Homebrew installation');

    try {
      // Untap the local tap if it exists
      await this.execCommand('brew', ['untap', this.localTap], {
        silent: true,
        ignoreReturnCode: true
      });

      info('✓ Cleanup completed');
    } finally {
      endGroup();
    }
  }
}
