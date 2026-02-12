import * as core from '@actions/core';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as exec from '@actions/exec';
import {
  InstallationState,
  IdempotencyResult,
  IIdempotencyConfig,
  ISettingsForChecksum,
  DEFAULT_IDEMPOTENCY_CONFIG
} from './types';
import {IMetanormaSettings} from '../metanorma-settings';

/**
 * Manages idempotency for the setup-metanorma action.
 *
 * Responsibilities:
 * - Detect if Metanorma is already installed with matching configuration
 * - Compare current configuration with previous installation
 * - Determine whether to skip or reinstall
 * - Save/load installation state to/from filesystem
 *
 * @sealed This class uses a singleton-like pattern and should not be extended.
 */
export class IdempotencyManager {
  private readonly config: IIdempotencyConfig;
  private readonly stateFilePath: string;

  /**
   * Create a new IdempotencyManager instance.
   *
   * @param config - Optional configuration to override defaults
   */
  constructor(config?: Partial<IIdempotencyConfig>) {
    this.config = {...DEFAULT_IDEMPOTENCY_CONFIG, ...config};
    const workspace = process.env['GITHUB_WORKSPACE'] || process.cwd();
    this.stateFilePath = path.join(workspace, this.config.stateFileName);
    core.debug(`Idempotency state file: ${this.stateFilePath}`);
  }

  /**
   * Check if installation should be skipped based on existing state.
   * This is the main entry point for idempotency checking.
   *
   * @param settings - The current installation settings
   * @returns IdempotencyResult indicating whether to skip installation
   */
  async checkAndSkipIfAlreadyInstalled(
    settings: IMetanormaSettings
  ): Promise<IdempotencyResult> {
    // If idempotency is disabled, proceed with installation
    if (!this.config.enabled) {
      return this.createResult(
        false,
        'not_installed',
        'Idempotency checking is disabled'
      );
    }

    // Load previous state
    const previousState = await this.loadInstallationState();

    // No previous state → proceed with installation
    if (!previousState) {
      return this.createResult(
        false,
        'not_installed',
        'No previous installation state found'
      );
    }

    // Check if we're in the same environment
    const envCheck = this.checkEnvironmentMatch(settings, previousState);
    if (!envCheck.matches) {
      return this.createResult(
        false,
        'configuration_changed',
        envCheck.reason,
        previousState
      );
    }

    // Calculate checksum of current configuration
    const currentChecksum = this.calculateChecksum(settings);

    // Check if configuration changed
    if (currentChecksum !== previousState.checksum) {
      core.info(`Configuration changed since last installation`);
      core.debug(`Previous checksum: ${previousState.checksum}`);
      core.debug(`Current checksum: ${currentChecksum}`);

      if (this.config.reinstallOnConfigChange) {
        return this.createResult(
          false,
          'configuration_changed',
          'Configuration changed, will reinstall',
          previousState
        );
      } else {
        core.warning('Configuration changed but reinstallOnConfigChange is disabled');
      }
    }

    // Check if metanorma is actually available in PATH
    const isAvailable = await this.checkMetanormaAvailable();

    if (!isAvailable) {
      core.info('Metanorma not found in PATH despite state file existing');
      return this.createResult(
        false,
        'not_installed',
        'Metanorma not found, will reinstall',
        previousState
      );
    }

    // Get installed version
    const installedVersion = await this.getInstalledVersion();

    // All checks pass → skip installation
    const details = installedVersion
      ? `Metanorma ${installedVersion} is already installed (installed at ${previousState.installedAt})`
      : `Metanorma is already installed`;

    return this.createResult(
      true,
      'already_installed',
      details,
      previousState,
      installedVersion
    );
  }

  /**
   * Save the current installation state after successful installation.
   *
   * @param settings - The installation settings used
   * @param installedVersion - The actual version installed (null if undetectable)
   */
  async saveInstallationState(
    settings: IMetanormaSettings,
    installedVersion: string | null
  ): Promise<void> {
    try {
      const state: InstallationState = {
        platform: settings.platform,
        installationMethod: settings.installationMethod,
        version: settings.version,
        installPath: settings.installPath,
        installedAt: this.config.now!(),
        metanormaVersion: installedVersion,
        checksum: this.calculateChecksum(settings)
      };

      const content = JSON.stringify(state, null, 2);
      await fs.promises.writeFile(this.stateFilePath, content, 'utf-8');

      core.info(`Saved installation state to ${this.stateFilePath}`);
      core.debug(`State: ${content}`);
    } catch (error) {
      core.warning(`Failed to save installation state: ${error}`);
    }
  }

  /**
   * Load the previous installation state from filesystem.
   *
   * @returns InstallationState if found and valid, null otherwise
   */
  async loadInstallationState(): Promise<InstallationState | null> {
    try {
      // Check if state file exists
      if (!fs.existsSync(this.stateFilePath)) {
        core.debug(`State file does not exist: ${this.stateFilePath}`);
        return null;
      }

      // Read and parse state file
      const content = await fs.promises.readFile(this.stateFilePath, 'utf-8');
      const state = JSON.parse(content) as InstallationState;

      // Validate required fields
      const validation = this.validateState(state);
      if (!validation.valid) {
        core.warning(`Invalid state file: ${validation.reason}`);
        return null;
      }

      core.debug(`Loaded installation state from ${this.stateFilePath}`);
      return state;
    } catch (error) {
      if (error instanceof SyntaxError) {
        core.warning(`Corrupt state file: ${error}`);
      } else {
        core.warning(`Failed to load installation state: ${error}`);
      }
      return null;
    }
  }

  /**
   * Clear the installation state (for cleanup or testing).
   */
  async clearState(): Promise<void> {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        await fs.promises.unlink(this.stateFilePath);
        core.info('Cleared installation state');
      }
    } catch (error) {
      core.warning(`Failed to clear state: ${error}`);
    }
  }

  /**
   * Get the state file path (for testing or debugging).
   */
  getStateFilePath(): string {
    return this.stateFilePath;
  }

  /**
   * Check if the current environment matches the saved state.
   */
  private checkEnvironmentMatch(
    settings: IMetanormaSettings,
    state: InstallationState
  ): { matches: boolean; reason: string } {
    // Check platform
    if (state.platform !== settings.platform) {
      return {
        matches: false,
        reason: `Platform changed: ${state.platform} → ${settings.platform}`
      };
    }

    // Check installation method
    if (state.installationMethod !== settings.installationMethod) {
      return {
        matches: false,
        reason: `Installation method changed: ${state.installationMethod} → ${settings.installationMethod}`
      };
    }

    // Check if install paths are related (one contains the other)
    // This handles cases where GITHUB_WORKSPACE might vary slightly
    const pathsRelated =
      settings.installPath.startsWith(state.installPath) ||
      state.installPath.startsWith(settings.installPath);

    if (!pathsRelated) {
      return {
        matches: false,
        reason: `Install path changed: ${state.installPath} → ${settings.installPath}`
      };
    }

    return { matches: true, reason: '' };
  }

  /**
   * Calculate a checksum of the relevant settings for change detection.
   */
  private calculateChecksum(settings: IMetanormaSettings): string {
    const checksumData: ISettingsForChecksum = {
      platform: settings.platform,
      installationMethod: settings.installationMethod,
      version: settings.version || '',
      snapChannel: settings.snapChannel,
      chocoPrerelease: settings.chocoPrerelease,
      gemfile: settings.gemfile,
      bundlerVersion: settings.bundlerVersion || '2.6.5'
    };

    // Create deterministic string and hash it
    const sortedKeys = Object.keys(checksumData).sort();
    const sortedData: Record<string, any> = {};
    for (const key of sortedKeys) {
      sortedData[key] = checksumData[key as keyof ISettingsForChecksum];
    }

    const content = JSON.stringify(sortedData);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if metanorma command is available in PATH.
   */
  private async checkMetanormaAvailable(): Promise<boolean> {
    // Method 1: Try 'command -v'
    try {
      const exitCode = await exec.exec('command', ['-v', 'metanorma'], {
        silent: true,
        ignoreReturnCode: true
      });
      if (exitCode === 0) {
        return true;
      }
    } catch {
      // Continue to next method
    }

    // Method 2: Try 'which' as fallback
    try {
      const exitCode = await exec.exec('which', ['metanorma'], {
        silent: true,
        ignoreReturnCode: true
      });
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the installed metanorma version.
   */
  private async getInstalledVersion(): Promise<string | null> {
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

      // Parse version from common output formats:
      // "metanorma version 1.14.3"
      // "metanorma version v1.14.3"
      // "1.14.3"
      const patterns = [
        /metanorma\s+version\s+v?(\d+\.\d+\.\d+)/i,
        /^v?(\d+\.\d+\.\d+)$/m
      ];

      for (const pattern of patterns) {
        const match = stdout.match(pattern);
        if (match) {
          return match[1];
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate the structure of a loaded state.
   */
  private validateState(
    state: InstallationState
  ): { valid: boolean; reason: string } {
    const required: (keyof InstallationState)[] = [
      'platform',
      'installationMethod',
      'checksum'
    ];

    for (const field of required) {
      if (state[field] === undefined || state[field] === null) {
        return { valid: false, reason: `Missing required field: ${field}` };
      }
    }

    if (typeof state.checksum !== 'string' || state.checksum.length !== 32) {
      return { valid: false, reason: 'Invalid checksum format' };
    }

    return { valid: true, reason: '' };
  }

  /**
   * Create a standardized result object.
   */
  private createResult(
    shouldSkip: boolean,
    reason: IdempotencyResult['reason'],
    details: string,
    previousState?: InstallationState,
    installedVersion?: string | null
  ): IdempotencyResult {
    return {
      shouldSkip,
      reason,
      details,
      previousState,
      installedVersion
    };
  }
}
