import type {IMetanormaSettings} from '../metanorma-settings.js';

/**
 * State saved after successful installation
 */
export interface InstallationState {
  /** Platform where installation occurred */
  platform: string;

  /** Installation method used */
  installationMethod: string;

  /** Version requested during installation */
  version: string | null;

  /** Path where metanorma was installed */
  installPath: string;

  /** ISO timestamp of installation */
  installedAt: string;

  /** Actual metanorma version installed (if detectable) */
  metanormaVersion: string | null;

  /** Hash of the configuration for change detection */
  checksum: string;
}

/**
 * Result of idempotency check
 */
export interface IdempotencyResult {
  /** Whether to skip installation */
  shouldSkip: boolean;

  /** Reason for the decision */
  reason:
    | 'already_installed'
    | 'configuration_changed'
    | 'not_installed'
    | 'error';

  /** Human-readable details about the decision */
  details: string;

  /** Previous state if available */
  previousState?: InstallationState;

  /** Actual metanorma version if detected */
  installedVersion?: string | null;
}

/**
 * Configuration for idempotency behavior
 */
export interface IIdempotencyConfig {
  /** Enable/disable idempotency checking */
  enabled: boolean;

  /** When configuration changes, reinstall instead of skipping */
  reinstallOnConfigChange: boolean;

  /** State file name (relative to GITHUB_WORKSPACE) */
  stateFileName: string;

  /** Function to get the current timestamp */
  now?: () => string;
}

/**
 * Default idempotency configuration
 */
export const DEFAULT_IDEMPOTENCY_CONFIG: IIdempotencyConfig = {
  enabled: true,
  reinstallOnConfigChange: true,
  stateFileName: '.metanorma-setup-state.json',
  now: () => new Date().toISOString()
};

/**
 * Settings subset used for checksum calculation
 */
export interface ISettingsForChecksum {
  platform: string;
  installationMethod: string;
  version: string | null;
  snapChannel: string;
  chocoPrerelease: boolean;
  gemfile?: string;
  bundlerVersion: string;
}
