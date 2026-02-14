import * as https from 'https';
import * as http from 'http';
import {debug} from '@actions/core';

/**
 * Version entry from the metanorma/versions gemfile versions.yaml
 */
export interface GemfileLockVersion {
  version: string;
  published_at: string | null;
  parsed_at: string | null;
  gemfile_exists: boolean;
  gemfile_path: string | null;
  gemfile_lock_path: string | null;
}

/**
 * Parsed structure of versions.yaml from metanorma/versions
 */
export interface GemfileLocksIndex {
  metadata: {
    generated_at: string;
    source: string;
    count: number;
    latest_version: string;
  };
  versions: GemfileLockVersion[];
}

/**
 * Fetcher for pre-built Gemfile.lock files from metanorma/versions repository
 */
export class GemfileLocksFetcher {
  private readonly baseUrl =
    'https://raw.githubusercontent.com/metanorma/versions/main/data/gemfile';
  private readonly indexUrl = `${this.baseUrl}/versions.yaml`;
  private indexCache: GemfileLocksIndex | null = null;

  /**
   * Simple YAML parser for the versions.yaml file
   * Handles basic YAML structure without external dependencies
   */
  private parseYaml(text: string): GemfileLocksIndex | null {
    try {
      const lines = text.split('\n');
      const result: GemfileLocksIndex = {
        metadata: {
          generated_at: '',
          source: '',
          count: 0,
          latest_version: ''
        },
        versions: []
      };

      let currentSection: 'metadata' | 'versions' | null = null;
      let currentVersion: GemfileLockVersion | null = null;

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Detect section headers
        if (trimmed === 'metadata:') {
          currentSection = 'metadata';
          continue;
        } else if (trimmed === 'versions:') {
          currentSection = 'versions';
          continue;
        }

        // Parse key-value pairs based on current section
        if (currentSection === 'metadata') {
          const match = trimmed.match(/^(\w+):\s*(.*)$/);
          if (match) {
            const [, key, value] = match;
            const cleanValue = value.replace(/^['"]|['"]$/g, '').trim();
            if (key === 'generated_at') {
              result.metadata.generated_at = cleanValue;
            } else if (key === 'source') {
              result.metadata.source = cleanValue.replace(/^:/, '');
            } else if (key === 'count') {
              result.metadata.count = parseInt(cleanValue, 10) || 0;
            } else if (key === 'latest_version') {
              result.metadata.latest_version = cleanValue;
            }
          }
        } else if (currentSection === 'versions') {
          // Match: - version: '1.14.4' or - version: "1.14.4" or - version: 1.14.4
          const versionMatch = trimmed.match(
            /^-\s*version:\s*['"]?(\d+\.\d+\.\d+)['"]?$/
          );

          if (versionMatch) {
            // If we have a pending version, add it to the array
            if (currentVersion) {
              result.versions.push(currentVersion);
            }
            // Start a new version entry
            currentVersion = {
              version: versionMatch[1],
              published_at: null,
              parsed_at: null,
              gemfile_exists: false,
              gemfile_path: null,
              gemfile_lock_path: null
            };
          } else if (currentVersion) {
            // Parse other fields for the current version
            const publishedMatch = trimmed.match(/^published_at:\s*(.*)$/);
            const parsedMatch = trimmed.match(/^parsed_at:\s*(.*)$/);
            const existsMatch = trimmed.match(/^gemfile_exists:\s*(\w+)$/);
            const pathMatch = trimmed.match(/^gemfile_path:\s*(.*)$/);
            const lockPathMatch = trimmed.match(/^gemfile_lock_path:\s*(.*)$/);

            if (publishedMatch) {
              const val = publishedMatch[1].trim().replace(/^['"]|['"]$/g, '');
              currentVersion.published_at = val || null;
            } else if (parsedMatch) {
              const val = parsedMatch[1].trim().replace(/^['"]|['"]$/g, '');
              currentVersion.parsed_at = val || null;
            } else if (existsMatch) {
              currentVersion.gemfile_exists = existsMatch[1] === 'true';
            } else if (pathMatch) {
              const val = pathMatch[1].trim().replace(/^['"]|['"]$/g, '');
              currentVersion.gemfile_path = val || null;
            } else if (lockPathMatch) {
              const val = lockPathMatch[1].trim().replace(/^['"]|['"]$/g, '');
              currentVersion.gemfile_lock_path = val || null;
            }
          }
        }
      }

      // Don't forget to add the last version entry
      if (currentVersion) {
        result.versions.push(currentVersion);
      }

      return result;
    } catch (error) {
      debug(`Failed to parse YAML: ${error}`);
      return null;
    }
  }

  /**
   * Fetch content from URL via HTTPS/HTTP
   */
  private async fetchUrl(url: string): Promise<string | null> {
    return new Promise(resolve => {
      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.get(url, res => {
        if (res.statusCode !== 200) {
          debug(`Fetch failed with status ${res.statusCode} for ${url}`);
          resolve(null);
          return;
        }

        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(data);
        });
      });

      request.on('error', error => {
        debug(`Fetch error for ${url}: ${error.message}`);
        resolve(null);
      });

      request.setTimeout(10000, () => {
        request.destroy();
        debug(`Fetch timeout for ${url}`);
        resolve(null);
      });
    });
  }

  /**
   * Fetch the versions.yaml to check version availability
   * Results are cached for the lifetime of the fetcher instance
   */
  async fetchIndex(): Promise<GemfileLocksIndex | null> {
    if (this.indexCache) {
      return this.indexCache;
    }

    debug(`Fetching index from ${this.indexUrl}`);
    const content = await this.fetchUrl(this.indexUrl);

    if (!content) {
      return null;
    }

    this.indexCache = this.parseYaml(content);
    return this.indexCache;
  }

  /**
   * Check if a specific version has a pre-built lock file
   * Note: We check by trying to fetch the file directly since the YAML
   * metadata may not be updated. The files exist at data/gemfile/v{version}/
   */
  async isVersionAvailable(version: string): Promise<boolean> {
    // Try to fetch the Gemfile directly to verify availability
    const gemfile = await this.fetchGemfile(version);
    const isAvailable = gemfile !== null;
    debug(`Version ${version} available in pre-built locks: ${isAvailable}`);
    return isAvailable;
  }

  /**
   * Download Gemfile.lock content for a specific version
   */
  async fetchGemfileLock(version: string): Promise<string | null> {
    const url = `${this.baseUrl}/v${version}/Gemfile.lock.archived`;
    debug(`Fetching Gemfile.lock for version ${version} from ${url}`);
    return this.fetchUrl(url);
  }

  /**
   * Download Gemfile content for a specific version
   */
  async fetchGemfile(version: string): Promise<string | null> {
    const url = `${this.baseUrl}/v${version}/Gemfile`;
    debug(`Fetching Gemfile for version ${version} from ${url}`);
    return this.fetchUrl(url);
  }

  /**
   * Get the latest version from the index
   */
  async getLatestVersion(): Promise<string | null> {
    const index = await this.fetchIndex();
    if (!index) {
      return null;
    }
    return index.metadata.latest_version;
  }

  /**
   * Get all available versions
   */
  async getAvailableVersions(): Promise<string[]> {
    const index = await this.fetchIndex();
    if (!index) {
      return [];
    }
    return index.versions.map(v => v.version);
  }
}
