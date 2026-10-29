import type {IMetanormaSettings} from '../metanorma-settings.js';
import {BaseInstaller} from './base-installer.js';
import {
  startGroup,
  endGroup,
  info,
  debug,
  warning,
  addPath
} from '@actions/core';
import {exec} from '@actions/exec';
import {existsSync} from 'fs';
import {join} from 'path';

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

      // Since the 1.17.0 MSI packaging, the installer records the install
      // directory in the MACHINE PATH. Each Actions step is a fresh process
      // that inherits the environment captured at job start, so that PATH
      // change is invisible to every later step ("Unable to locate
      // executable file: metanorma.exe"). Locate the install directory
      // ourselves and export it for this job.
      const installDir = await this.resolveMsiInstallDir();
      if (installDir) {
        addPath(installDir);
        info(`Added Metanorma install directory to PATH: ${installDir}`);
      } else {
        warning(
          'Could not locate the Metanorma install directory; the machine PATH set by the MSI will not be visible to later steps'
        );
      }
    } finally {
      endGroup();
    }
  }

  /**
   * Find the directory holding metanorma.exe after the MSI install.
   * The MSI's ARP entry carries no InstallLocation, so fall back to a
   * bounded search of the per-machine Program Files roots (the tebako
   * packaging installs under Program Files and extends the system PATH).
   */
  private async resolveMsiInstallDir(): Promise<string | null> {
    return (
      (await this.resolveInstallDirFromRegistry()) ??
      (await this.resolveInstallDirFromFilesystem())
    );
  }

  private async resolveInstallDirFromRegistry(): Promise<string | null> {
    const script = [
      '$e = Get-ItemProperty',
      "'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',",
      "'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'",
      '-ErrorAction SilentlyContinue |',
      "Where-Object { $_.DisplayName -like '*Metanorma*' -and $_.InstallLocation } |",
      'Select-Object -First 1;',
      'if ($e -and $e.InstallLocation) { $e.InstallLocation }'
    ].join(' ');

    const dir = await this.runPowershellCapture(script);
    if (!dir) {
      debug('No Metanorma uninstall entry with InstallLocation found');
      return null;
    }
    return this.pickExeDir(dir);
  }

  private async resolveInstallDirFromFilesystem(): Promise<string | null> {
    const script = [
      "$h = Get-ChildItem 'C:\\Program Files','C:\\Program Files (x86)'",
      '-Recurse -Depth 4 -Filter metanorma.exe -File',
      '-ErrorAction SilentlyContinue | Select-Object -First 1;',
      'if ($h) { $h.DirectoryName }'
    ].join(' ');

    const dir = await this.runPowershellCapture(script);
    if (!dir) {
      debug('metanorma.exe not found under the Program Files roots');
      return null;
    }
    return dir;
  }

  private async runPowershellCapture(script: string): Promise<string | null> {
    let output = '';
    const exitCode = await exec(
      'powershell',
      ['-NoProfile', '-Command', script],
      {
        silent: true,
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          }
        }
      }
    );

    if (exitCode !== 0) {
      debug(`Install-location query exited ${exitCode}`);
      return null;
    }

    return output.trim() || null;
  }

  private pickExeDir(dir: string): string {
    // Some MSI layouts record the root install directory while the
    // executable lives in a bin subdirectory.
    if (existsSync(join(dir, 'metanorma.exe'))) {
      return dir;
    }
    if (existsSync(join(dir, 'bin', 'metanorma.exe'))) {
      return join(dir, 'bin');
    }
    debug(`metanorma.exe not found under ${dir}; exporting the root anyway`);
    return dir;
  }

  async cleanup(): Promise<void> {
    // Chocolatey doesn't require cleanup
    debug('Chocolatey installer: No cleanup needed');
  }
}
