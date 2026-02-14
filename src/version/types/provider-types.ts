import type {Platform} from './platform-types.js';
import type {VersionInfo} from './platform-types.js';

/** Re-export VersionInfo for use in this module */
export type {VersionInfo};

/** Abstract interface for version providers */
export interface IVersionProvider<T extends VersionInfo = VersionInfo> {
  /** Platform identifier */
  readonly platform: Platform;

  /** Get all version data for this platform */
  getVersions(): ReadonlyArray<T>;

  /** Get specific version info */
  getVersion(version: string): T | undefined;

  /** Get latest version number */
  getLatest(): string;

  /** Check if version is available */
  isAvailable(version: string): boolean;

  /** Get available version numbers */
  getAvailableVersions(): string[];
}

/** Re-export Platform for convenience */
export type {Platform};
