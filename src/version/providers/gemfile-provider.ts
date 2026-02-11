import { VersionProvider } from './version-provider';
import { MnenvAllVersions } from '../types/mnenv-types';
import { GemfileVersionInfo } from '../types/platform-types';

/**
 * Provides Gemfile version information for Docker-based installations.
 */
export class GemfileProvider extends VersionProvider<GemfileVersionInfo> {
  readonly platform = 'gemfile' as const;

  constructor(mnenvData: MnenvAllVersions) {
    const versions = transformVersions(mnenvData.gemfile.versions);
    const data = {
      count: mnenvData.gemfile.count,
      latest: mnenvData.gemfile.latest,
      versions
    };

    super(data);
  }

  /**
   * Check if Gemfile exists locally for a version.
   */
  hasGemfile(version: string): boolean {
    return this.getVersion(version)?.gemfileExists ?? false;
  }
}

function transformVersions(mnenvVersions: MnenvGemfileVersion[]): GemfileVersionInfo[] {
  return mnenvVersions.map(v => ({
    version: v.version,
    gemfileExists: v.gemfile_exists,
    publishedAt: v.published_at ? new Date(v.published_at) : null,
    parsedAt: v.parsed_at ? new Date(v.parsed_at) : null,
    displayName: v.display_name
  }));
}

type MnenvGemfileVersion = MnenvAllVersions['gemfile']['versions'][number];
