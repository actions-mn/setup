import type {IMetanormaSettings} from '../metanorma-settings.js';
import {BaseInstaller} from './base-installer.js';
import {startGroup, endGroup, info, debug, warning} from '@actions/core';

/**
 * Windows Chocolatey installer
 * Installs Metanorma using Chocolatey package manager
 */
export class ChocoInstaller extends BaseInstaller {
  async install(settings: IMetanormaSettings): Promise<void> {
    startGroup('Installing Metanorma via Chocolatey');

    try {
      // Workaround for Python 3.10-3.11 installation issues
      // Install Python 3.9.13 first
      info('Installing Python 3.9.13 (workaround for compatibility)...');
      const pythonExitCode = await this.execCommand('choco', [
        'install',
        'python3',
        '--version',
        '3.9.13',
        '--yes',
        '--no-progress'
      ]);

      if (pythonExitCode !== 0) {
        warning('Python 3.9.13 installation failed, continuing anyway...');
      }

      // Install Metanorma
      let args: string[] = ['install', 'metanorma', '--yes', '--no-progress'];

      if (settings.chocoPrerelease) {
        args.push('--pre');
        info('Installing Metanorma with pre-release flag...');
      }

      if (settings.version) {
        args.push('--version');
        const version = settings.chocoPrerelease
          ? `${settings.version}-pre`
          : settings.version;
        args.push(version);
        info(`Installing Metanorma version ${version}...`);
      } else {
        info('Installing Metanorma latest...');
      }

      // Ignore return code for git.install failure (known issue)
      const options = {
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => {
            const output = data.toString();
            if (output.includes(' - git.install (exited 1)')) {
              warning(
                'git.install failed, but this is expected and can be ignored'
              );
            }
          }
        }
      };

      const exitCode = await this.execCommand('choco', args, options);

      if (exitCode !== 0) {
        // Check if it's the git.install issue we can ignore
        warning(
          `Chocolatey installation exited with code ${exitCode}, checking if Metanorma is installed...`
        );
        const metanormaExists = await this.commandExists('metanorma');
        if (!metanormaExists) {
          throw new Error(
            `Chocolatey installation failed and metanorma command not found`
          );
        }
      }

      info('✓ Metanorma installed successfully via Chocolatey');
    } finally {
      endGroup();
    }
  }

  async cleanup(): Promise<void> {
    // Chocolatey doesn't require cleanup
    debug('Chocolatey installer: No cleanup needed');
  }
}
