/** Supported platforms */
export type Platform = 'gemfile' | 'snap' | 'homebrew' | 'chocolatey';

/** Architecture types */
export type Architecture = 'amd64' | 'arm64' | 'x86_64' | 'aarch64';

/** Snap channels */
export type SnapChannel = 'stable' | 'candidate' | 'beta' | 'edge';

/** Base version info */
export interface BaseVersionInfo {
  version: string;
  publishedAt: Date | null;
  parsedAt: Date | null;
  displayName: string;
}

/** Gemfile version info */
export interface GemfileVersionInfo extends BaseVersionInfo {
  gemfileExists: boolean;
}

/** Snap version info */
export interface SnapVersionInfo extends BaseVersionInfo {
  revision: number;
  channel: SnapChannel;
  architecture: Architecture;
}

/** Homebrew version info */
export interface HomebrewVersionInfo extends BaseVersionInfo {
  tagName: string;
  commitSha: string;
}

/** Chocolatey version info */
export interface ChocolateyVersionInfo extends BaseVersionInfo {
  packageName: string;
  isPreRelease: boolean;
}

/** Version info union type */
export type VersionInfo =
  | GemfileVersionInfo
  | SnapVersionInfo
  | HomebrewVersionInfo
  | ChocolateyVersionInfo;

/** Platform version data */
export interface PlatformVersionData<T extends VersionInfo = VersionInfo> {
  count: number;
  latest: string;
  versions: T[];
}
