/** Supported platforms */
export type Platform = 'gemfile' | 'snap' | 'homebrew' | 'chocolatey' | 'binary';

/** Architecture types */
export type Architecture = 'amd64' | 'arm64' | 'x86_64' | 'aarch64';

/** Snap channels */
export type SnapChannel = 'stable' | 'candidate' | 'beta' | 'edge';

/** Binary platform names (OS) */
export type BinaryPlatformName = 'darwin' | 'linux' | 'windows';

/** Binary formats */
export type BinaryFormat = 'tgz' | 'zip' | 'exe';

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

/** Binary platform artifact info */
export interface BinaryPlatformArtifact {
  name: BinaryPlatformName;
  arch: Architecture;
  format: BinaryFormat;
  filename: string;
  url: string;
  size: number;
  variant?: string; // e.g., 'musl' for Alpine
}

/** Binary (packed-mn) version info */
export interface BinaryVersionInfo extends BaseVersionInfo {
  tagName: string;
  htmlUrl: string;
  platforms: BinaryPlatformArtifact[];
}

/** Version info union type */
export type VersionInfo =
  | GemfileVersionInfo
  | SnapVersionInfo
  | HomebrewVersionInfo
  | ChocolateyVersionInfo
  | BinaryVersionInfo;

/** Platform version data */
export interface PlatformVersionData<T extends VersionInfo = VersionInfo> {
  count: number;
  latest: string;
  versions: T[];
}
