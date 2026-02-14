/** Raw Mnenv JSON response types */
export interface MnenvGemfileVersion {
  version: string;
  published_at: string | null;
  parsed_at: string | null;
  display_name: string;
  gemfile_exists: boolean;
}

export interface MnenvSnapVersion {
  version: string;
  revision: number;
  channel: string;
  arch?: string;
  published_at: string | null;
  parsed_at: string | null;
  display_name: string;
}

export interface MnenvHomebrewVersion {
  version: string;
  tag_name: string;
  commit_sha: string;
  published_at: string | null;
  parsed_at: string | null;
  display_name: string;
}

export interface MnenvChocolateyVersion {
  version: string;
  package_name: string;
  is_pre_release: boolean;
  published_at: string | null;
  parsed_at: string | null;
  display_name: string;
}

export interface MnenvBinaryPlatformArtifact {
  name: string;
  arch: string;
  format: string;
  filename: string;
  url: string;
  size: number;
  variant?: string;
}

export interface MnenvBinaryVersion {
  version: string;
  published_at: string | null;
  parsed_at: string | null;
  display_name: string;
  tag_name: string;
  html_url: string;
  platforms: MnenvBinaryPlatformArtifact[];
}

export interface MnenvPlatformData<T> {
  count: number;
  latest: string;
  versions: T[];
}

export interface MnenvAllVersions {
  gemfile: MnenvPlatformData<MnenvGemfileVersion>;
  snap: MnenvPlatformData<MnenvSnapVersion>;
  homebrew: MnenvPlatformData<MnenvHomebrewVersion>;
  chocolatey: MnenvPlatformData<MnenvChocolateyVersion>;
  binary: MnenvPlatformData<MnenvBinaryVersion>;
}
