import {VersionProvider} from './version-provider.js';
import type {MnenvAllVersions} from '../types/mnenv-types.js';
import type {HomebrewVersionInfo} from '../types/platform-types.js';

/**
 * Provides Homebrew version information with git tag and commit details.
 */
export class HomebrewProvider extends VersionProvider<HomebrewVersionInfo> {
  readonly platform = 'homebrew' as const;

  constructor(mnenvData: MnenvAllVersions) {
    const versions = transformVersions(mnenvData.homebrew.versions);
    const data = {
      count: mnenvData.homebrew.count,
      latest: mnenvData.homebrew.latest,
      versions
    };

    super(data);
  }

  /**
   * Get git tag name for a version.
   */
  getTagName(version: string): string | undefined {
    return this.getVersion(version)?.tagName;
  }

  /**
   * Get commit SHA for a version.
   */
  getCommitSha(version: string): string | undefined {
    return this.getVersion(version)?.commitSha;
  }
}

function transformVersions(
  mnenvVersions: MnenvHomebrewVersion[]
): HomebrewVersionInfo[] {
  return mnenvVersions.map(v => ({
    version: v.version,
    tagName: v.tag_name,
    commitSha: v.commit_sha,
    publishedAt: v.published_at ? new Date(v.published_at) : null,
    parsedAt: v.parsed_at ? new Date(v.parsed_at) : null,
    displayName: v.display_name
  }));
}

type MnenvHomebrewVersion = MnenvAllVersions['homebrew']['versions'][number];
