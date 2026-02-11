import { IVersionProvider, VersionInfo, Platform } from '../types/provider-types';
import { PlatformVersionData } from '../types/platform-types';

/**
 * Abstract base class for version providers.
 * Implements common functionality and defines the provider interface.
 *
 * @abstract Subclasses must implement getVersionsInternal()
 */
export abstract class VersionProvider<T extends VersionInfo = VersionInfo>
  implements IVersionProvider<T>
{
  protected data: PlatformVersionData<T>;

  constructor(data: PlatformVersionData<T>) {
    this.data = Object.freeze({ ...data, versions: [...data.versions] });
  }

  /** Platform identifier (must be implemented by subclass) */
  abstract readonly platform: Platform;

  /** Get all version data (immutable) */
  getVersions(): ReadonlyArray<T> {
    return this.data.versions;
  }

  /** Get specific version info */
  getVersion(version: string): T | undefined {
    return this.data.versions.find(v => v.version === version);
  }

  /** Get latest version number */
  getLatest(): string {
    return this.data.latest;
  }

  /** Check if version is available */
  isAvailable(version: string): boolean {
    return this.data.versions.some(v => v.version === version);
  }

  /** Get available version numbers */
  getAvailableVersions(): string[] {
    return this.data.versions.map(v => v.version);
  }
}
