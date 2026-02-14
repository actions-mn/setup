import {VersionProvider} from './version-provider.js';
import type {MnenvAllVersions} from '../types/mnenv-types.js';
import type {
  SnapVersionInfo,
  Architecture,
  SnapChannel
} from '../types/platform-types.js';

/**
 * Provides snap version information with architecture and channel support.
 */
export class SnapProvider extends VersionProvider<SnapVersionInfo> {
  readonly platform = 'snap' as const;

  private byVersion: Map<string, Map<Architecture, SnapVersionInfo>>;
  private byChannel: Map<SnapChannel, string>;

  constructor(mnenvData: MnenvAllVersions) {
    const versions = transformSnapVersions(mnenvData.snap.versions);
    const data = {
      count: mnenvData.snap.count,
      latest: mnenvData.snap.latest,
      versions
    };

    super(data);
    this.byVersion = buildVersionMap(versions);
    this.byChannel = buildChannelMap(versions);
  }

  /**
   * Get snap revision for specific version and architecture.
   */
  getRevision(
    version: string,
    arch: Architecture = 'amd64'
  ): number | undefined {
    return this.byVersion.get(version)?.get(arch)?.revision;
  }

  /**
   * Get snap channel for specific version and architecture.
   */
  getChannel(
    version: string,
    arch: Architecture = 'amd64'
  ): SnapChannel | undefined {
    return this.byVersion.get(version)?.get(arch)?.channel;
  }

  /**
   * Get latest version for a channel.
   */
  getLatestForChannel(channel: SnapChannel): string | undefined {
    return this.byChannel.get(channel);
  }

  /**
   * Get all architectures available for a version.
   */
  getArchitectures(version: string): Architecture[] {
    const archMap = this.byVersion.get(version);
    return archMap ? Array.from(archMap.keys()) : [];
  }
}

// Helper functions

function transformSnapVersions(
  mnenvVersions: MnenvSnapVersion[]
): SnapVersionInfo[] {
  return mnenvVersions.map(v => ({
    version: v.version,
    revision: v.revision,
    channel: v.channel as SnapChannel,
    architecture: (v.arch || 'amd64') as Architecture,
    publishedAt: v.published_at ? new Date(v.published_at) : null,
    parsedAt: v.parsed_at ? new Date(v.parsed_at) : null,
    displayName: v.display_name
  }));
}

function buildVersionMap(
  versions: SnapVersionInfo[]
): Map<string, Map<Architecture, SnapVersionInfo>> {
  const map = new Map<string, Map<Architecture, SnapVersionInfo>>();

  for (const v of versions) {
    if (!map.has(v.version)) {
      map.set(v.version, new Map());
    }
    map.get(v.version)!.set(v.architecture, v);
  }

  return map;
}

function buildChannelMap(
  versions: SnapVersionInfo[]
): Map<SnapChannel, string> {
  const map = new Map<SnapChannel, string>();

  for (const v of versions) {
    const current = map.get(v.channel) || '';
    if (v.version > current) {
      map.set(v.channel, v.version);
    }
  }

  return map;
}

// Type import for Mnenv
type MnenvSnapVersion = MnenvAllVersions['snap']['versions'][number];
