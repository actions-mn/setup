import {IMetanormaSettings} from '../metanorma-settings';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import fetch from 'node-fetch';

/**
 * Base installer interface
 * All platform-specific installers must implement this interface
 */
export interface IMetanormaInstaller {
  /**
   * Install Metanorma
   * @param settings Installation settings
   */
  install(settings: IMetanormaSettings): Promise<void>;

  /**
   * Cleanup after installation
   * Removes temporary files, partial installations, etc.
   */
  cleanup(): Promise<void>;
}

/**
 * Abstract base class for installers
 * Provides common functionality for all installers
 */
export abstract class BaseInstaller implements IMetanormaInstaller {
  /**
   * Execute a command and return the exit code
   */
  protected async execCommand(
    command: string,
    args: string[] = [],
    options: any = {}
  ): Promise<number> {
    const fullCommand = [command, ...args].join(' ');
    core.debug(`Executing: ${fullCommand}`);
    const result = await exec.exec(command, args, options);
    // When ignoreReturnCode is true, exec returns an object with {code, stdout, stderr}
    // Otherwise it returns the exit code directly
    if (typeof result === 'number') {
      return result;
    }
    // result is an object with code property
    const code = (result as any).code;
    return code !== undefined ? code : 1; // Default to 1 (failure) if code is undefined
  }

  /**
   * Download a file from URL
   */
  protected async downloadFile(url: string, path: string): Promise<void> {
    core.debug(`Downloading ${url} to ${path}`);
    const res = await fetch(url);

    await new Promise<void>((resolve, reject) => {
      const fileStream = fs.createWriteStream(path);
      if (res.body) {
        res.body.pipe(fileStream);
        res.body.on('error', (err: Error) => {
          core.error(`Download error: ${err.message}`);
          reject(err);
        });
        fileStream.on('finish', () => {
          core.debug(`Download completed: ${path}`);
          resolve();
        });
        fileStream.on('error', (err: Error) => {
          core.error(`File write error: ${err.message}`);
          reject(err);
        });
      } else {
        reject(new Error('Missing body in response'));
      }
    });
  }

  /**
   * Check if a command exists
   * Uses multiple methods for reliability
   */
  protected async commandExists(command: string): Promise<boolean> {
    // Method 1: Try 'command -v'
    try {
      const exitCode = await this.execCommand('command', ['-v', command], {
        silent: true,
        ignoreReturnCode: true
      });
      if (exitCode === 0) {
        return true;
      }
    } catch (error) {
      core.debug(`commandExists via 'command -v' failed for '${command}': ${error}`);
    }

    // Method 2: Try 'which' (more reliable on some systems)
    try {
      const exitCode = await this.execCommand('which', [command], {
        silent: true,
        ignoreReturnCode: true
      });
      if (exitCode === 0) {
        return true;
      }
    } catch (error) {
      core.debug(`commandExists via 'which' failed for '${command}': ${error}`);
    }

    return false;
  }

  abstract install(settings: IMetanormaSettings): Promise<void>;
  abstract cleanup(): Promise<void>;
}
