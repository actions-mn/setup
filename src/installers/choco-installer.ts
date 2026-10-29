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
      // executable file: metanorma.exe"). Export the MSI's own PATH entries for
      // this job, re-running its bootstrap seed when it did not complete.
      await this.exportMsiPathEntries();
    } finally {
      endGroup();
    }
  }

  /**
   * The 1.17.0 MSI installs under C:\Program Files\metanorma, appends
   * <install>\bin and <install>\home\shims (the metanorma shim lives in
   * the latter) to the MACHINE PATH, and seeds the shims through
   * bootstrap-seed.cmd. Each Actions step is a fresh process that
   * inherits the environment captured at job start, so neither the PATH
   * change nor a failed seed self-heals: locate the install directory
   * (the MSI records it under SOFTWARE\Metanorma\metanorma!InstallDir),
   * re-run the idempotent seed, and export both directories.
   */
  private async exportMsiPathEntries(): Promise<void> {
    const installDir = await this.resolveMsiInstallDir();
    if (!installDir) {
      warning(
        'Could not locate the Metanorma install directory; the machine PATH set by the MSI will not be visible to later steps'
      );
      return;
    }

    const seed = join(installDir, 'bootstrap-seed.cmd');
    if (existsSync(seed)) {
      const code = await this.execCommand(
        'cmd',
        ['/c', seed],
        { silent: true, ignoreReturnCode: true }
      );
      if (code !== 0) {
        warning(`bootstrap-seed.cmd exited ${code}; continuing`);
      }
    }

    let added = 0;
    for (const sub of ['bin', join('home', 'shims')]) {
      const dir = join(installDir, sub);
      if (existsSync(dir)) {
        addPath(dir);
        info(`Added to PATH: ${dir}`);
        added += 1;
      }
    }
    if (added === 0) {
      addPath(installDir);
      info(`Added to PATH: ${installDir}`);
    }
  }

  /**
   * Locate the MSI install directory: the InstallDir registry value the
   * MSI writes, falling back to its known default location.
   */
  private async resolveMsiInstallDir(): Promise<string | null> {
    const script = [
      '$p = Get-ItemProperty',
      "'HKLM:\\SOFTWARE\\Metanorma\\metanorma',",
      "'HKLM:\\SOFTWARE\\WOW6432Node\\Metanorma\\metanorma',",
      "'HKCU:\\SOFTWARE\\Metanorma\\metanorma'",
      '-ErrorAction SilentlyContinue |',
      'Where-Object { $_.InstallDir } | Select-Object -First 1;',
      'if ($p -and $p.InstallDir) { $p.InstallDir }'
    ].join(' ');

    const dir = await this.runPowershellCapture(script);
    if (dir) {
      return dir;
    }
    debug('No InstallDir registry value found; trying the default location');

    const fallback = join(
      process.env['ProgramFiles'] ?? 'C:\\Program Files',
      'metanorma'
    );
    return existsSync(fallback) ? fallback : null;
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

  async cleanup(): Promise<void> {
    // Chocolatey doesn't require cleanup
    debug('Chocolatey installer: No cleanup needed');
  }
}
