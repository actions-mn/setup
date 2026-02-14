import { VersionProvider } from './version-provider';
import { MnenvAllVersions } from '../types/mnenv-types';
import {
  BinaryVersionInfo,
  BinaryPlatformArtifact,
  BinaryPlatformName,
  BinaryFormat,
  Architecture,
} from '../types/platform-types';

/**
 * Provides binary (packed-mn) version information with platform-specific artifacts.
 */
export class BinaryProvider extends VersionProvider<BinaryVersionInfo> {
  readonly platform = 'binary' as const;

  private byVersion: Map<string, BinaryVersionInfo>;

  constructor(mnenvData: MnenvAllVersions) {
    const versions = transformBinaryVersions(mnenvData.binary.versions);
    const data = {
      count: mnenvData.binary.count,
      latest: mnenvData.binary.latest,
      versions
    };

    super(data);
    this.byVersion = new Map(versions.map(v => [v.version, v]));
  }

  /**
   * Get all platform artifacts for a specific version.
   */
  getPlatforms(version: string): BinaryPlatformArtifact[] {
    const info = this.byVersion.get(version);
    return info?.platforms || [];
  }

  /**
   * Get artifact for a specific version, platform, and architecture.
   */
  getArtifact(
    version: string,
    platformName: BinaryPlatformName,
    arch: Architecture,
    variant?: string
  ): BinaryPlatformArtifact | undefined {
    const platforms = this.getPlatforms(version);
    return platforms.find(p =>
      p.name === platformName &&
      p.arch === arch &&
      (variant ? p.variant === variant : !p.variant)
    );
  }

  /**
   * Get the best matching artifact for the current system.
   */
  getBestMatch(version: string): BinaryPlatformArtifact | undefined {
    const platforms = this.getPlatforms(version);
    if (platforms.length === 0) return undefined;

    const targetName = this.detectPlatformName();
    const targetArch = this.detectArchitecture();
    const targetVariant = this.detectVariant();

    // Try exact match first (platform + arch + variant)
    const exactMatch = platforms.find(p =>
      p.name === targetName &&
      p.arch === targetArch &&
      p.variant === targetVariant
    );
    if (exactMatch) return exactMatch;

    // Try platform + arch without variant
    const archMatch = platforms.find(p =>
      p.name === targetName &&
      p.arch === targetArch &&
      !p.variant
    );
    if (archMatch) return archMatch;

    // Fallback to any matching platform
    const platformMatch = platforms.find(p => p.name === targetName);
    return platformMatch;
  }

  /**
   * Get download URL for a specific version and platform.
   */
  getDownloadUrl(
    version: string,
    platformName?: BinaryPlatformName,
    arch?: Architecture
  ): string | undefined {
    if (platformName && arch) {
      const artifact = this.getArtifact(version, platformName, arch);
      return artifact?.url;
    }

    const bestMatch = this.getBestMatch(version);
    return bestMatch?.url;
  }

  /**
   * Get all available platform names for a version.
   */
  getAvailablePlatforms(version: string): BinaryPlatformName[] {
    const platforms = this.getPlatforms(version);
    const names = new Set(platforms.map(p => p.name));
    return Array.from(names) as BinaryPlatformName[];
  }

  /**
   * Get all available architectures for a version and platform.
   */
  getAvailableArchitectures(
    version: string,
    platformName: BinaryPlatformName
  ): Architecture[] {
    const platforms = this.getPlatforms(version);
    return platforms
      .filter(p => p.name === platformName)
      .map(p => p.arch);
  }

  /**
   * Detect current platform name.
   */
  private detectPlatformName(): BinaryPlatformName {
    switch (process.platform) {
      case 'darwin':
        return 'darwin';
      case 'linux':
        return 'linux';
      case 'win32':
        return 'windows';
      default:
        return 'linux'; // fallback
    }
  }

  /**
   * Detect current architecture.
   */
  private detectArchitecture(): Architecture {
    const arch = process.arch;
    switch (arch) {
      case 'arm64':
        return 'arm64';
      case 'x64':
        return 'x86_64';
      case 'arm':
        return 'aarch64';
      default:
        return 'x86_64'; // fallback
    }
  }

  /**
   * Detect variant (e.g., musl for Alpine).
   */
  private detectVariant(): string | undefined {
    // Check for Alpine Linux by looking for apk or musl
    // This is a heuristic - in practice, this should be passed in
    return undefined;
  }
}

// Helper functions

function transformBinaryVersions(mnenvVersions: MnenvBinaryVersion[]): BinaryVersionInfo[] {
  return mnenvVersions.map(v => ({
    version: v.version,
    tagName: v.tag_name,
    htmlUrl: v.html_url,
    publishedAt: v.published_at ? new Date(v.published_at) : null,
    parsedAt: v.parsed_at ? new Date(v.parsed_at) : null,
    displayName: v.display_name || v.version,
    platforms: (v.platforms || []).map(p => ({
      name: p.name as BinaryPlatformName,
      arch: p.arch as Architecture,
      format: p.format as BinaryFormat,
      filename: p.filename,
      url: p.url,
      size: p.size,
      variant: p.variant,
    })),
  }));
}

// Type import for Mnenv
type MnenvBinaryVersion = MnenvAllVersions['binary']['versions'][number];
