import { VersionProvider } from './version-provider';
import { MnenvAllVersions } from '../types/mnenv-types';
import { ChocolateyVersionInfo } from '../types/platform-types';

/**
 * Provides Chocolatey version information with package name and pre-release flags.
 */
export class ChocolateyProvider extends VersionProvider<ChocolateyVersionInfo> {
  readonly platform = 'chocolatey' as const;

  constructor(mnenvData: MnenvAllVersions) {
    const versions = transformVersions(mnenvData.chocolatey.versions);
    const data = {
      count: mnenvData.chocolatey.count,
      latest: mnenvData.chocolatey.latest,
      versions
    };

    super(data);
  }

  /**
   * Get Chocolatey package name for a version.
   */
  getPackageName(version: string): string | undefined {
    return this.getVersion(version)?.packageName;
  }

  /**
   * Check if version is a pre-release.
   */
  isPreRelease(version: string): boolean {
    return this.getVersion(version)?.isPreRelease ?? false;
  }
}

function transformVersions(mnenvVersions: MnenvChocolateyVersion[]): ChocolateyVersionInfo[] {
  return mnenvVersions.map(v => ({
    version: v.version,
    packageName: v.package_name,
    isPreRelease: v.is_pre_release,
    publishedAt: v.published_at ? new Date(v.published_at) : null,
    parsedAt: v.parsed_at ? new Date(v.parsed_at) : null,
    displayName: v.display_name
  }));
}

type MnenvChocolateyVersion = MnenvAllVersions['chocolatey']['versions'][number];
