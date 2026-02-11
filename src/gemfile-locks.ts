import * as https from 'https';
import * as http from 'http';
import * as core from '@actions/core';

/**
 * Version entry from the metanorma-gemfile-locks index.yaml
 */
export interface GemfileLockVersion {
  version: string;
  updated_at: string;
}

/**
 * Parsed structure of index.yaml from metanorma-gemfile-locks
 */
export interface GemfileLocksIndex {
  metadata: {
    generated_at: string;
    local_count: number;
    remote_count: number;
    latest_version: string;
  };
  versions: GemfileLockVersion[];
  missing_versions: string[];
}

/**
 * Fetcher for pre-built Gemfile.lock files from metanorma-gemfile-locks repository
 */
export class GemfileLocksFetcher {
  private readonly baseUrl =
    'https://raw.githubusercontent.com/metanorma/metanorma-gemfile-locks/main';
  private readonly indexUrl = `${this.baseUrl}/index.yaml`;
  private indexCache: GemfileLocksIndex | null = null;

  /**
   * Simple YAML parser for the index file
   * Handles basic YAML structure without external dependencies
   */
  private parseYaml(text: string): GemfileLocksIndex | null {
    try {
      const lines = text.split('\n');
      const result: GemfileLocksIndex = {
        metadata: {
          generated_at: '',
          local_count: 0,
          remote_count: 0,
          latest_version: ''
        },
        versions: [],
        missing_versions: []
      };

      let currentSection: 'metadata' | 'versions' | 'missing_versions' | null =
        null;
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
        } else if (trimmed === 'missing_versions:') {
          currentSection = 'missing_versions';
          continue;
        }

        // Parse key-value pairs based on current section
        if (currentSection === 'metadata') {
          const match = trimmed.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const [, key, value] = match;
            const cleanValue = value.replace(/^['"]|['"]$/g, '');
            if (key === 'generated_at') {
              result.metadata.generated_at = cleanValue;
            } else if (key === 'local_count') {
              result.metadata.local_count = parseInt(cleanValue, 10);
            } else if (key === 'remote_count') {
              result.metadata.remote_count = parseInt(cleanValue, 10);
            } else if (key === 'latest_version') {
              result.metadata.latest_version = cleanValue;
            }
          }
        } else if (currentSection === 'versions') {
          // Match: - version: '1.14.4' or - version: "1.14.4" or - version: 1.14.4
          const versionMatch = trimmed.match(
            /^-\s*version:\s*['"]?(\d+\.\d+\.\d+)['"]?$/
          );
          // Match: updated_at: '2025-01-15' (may have leading spaces due to YAML indentation)
          const updatedMatch = trimmed.match(
            /updated_at:\s*['"]?([^'"]+)['"]?$/
          );

          if (versionMatch) {
            // If we have a pending version, add it to the array
            if (currentVersion) {
              result.versions.push(currentVersion);
            }
            // Start a new version entry
            currentVersion = {
              version: versionMatch[1],
              updated_at: ''
            };
          } else if (updatedMatch && currentVersion) {
            // Update the current version with the updated_at value
            currentVersion.updated_at = updatedMatch[1];
          }
        } else if (currentSection === 'missing_versions') {
          const versionMatch = trimmed.match(/^-\s*['"]?(\d+\.\d+\.\d+)['"]?$/);
          if (versionMatch) {
            result.missing_versions.push(versionMatch[1]);
          }
        }
      }

      // Don't forget to add the last version entry
      if (currentVersion) {
        result.versions.push(currentVersion);
      }

      return result;
    } catch (error) {
      core.debug(`Failed to parse YAML: ${error}`);
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
          core.debug(`Fetch failed with status ${res.statusCode} for ${url}`);
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
        core.debug(`Fetch error for ${url}: ${error.message}`);
        resolve(null);
      });

      request.setTimeout(10000, () => {
        request.destroy();
        core.debug(`Fetch timeout for ${url}`);
        resolve(null);
      });
    });
  }

  /**
   * Fetch the index.yaml to check version availability
   * Results are cached for the lifetime of the fetcher instance
   */
  async fetchIndex(): Promise<GemfileLocksIndex | null> {
    if (this.indexCache) {
      return this.indexCache;
    }

    core.debug(`Fetching index from ${this.indexUrl}`);
    const content = await this.fetchUrl(this.indexUrl);

    if (!content) {
      return null;
    }

    this.indexCache = this.parseYaml(content);
    return this.indexCache;
  }

  /**
   * Check if a specific version has a pre-built lock file
   */
  async isVersionAvailable(version: string): Promise<boolean> {
    const index = await this.fetchIndex();
    if (!index) {
      return false;
    }

    const isAvailable = index.versions.some(v => v.version === version);
    core.debug(
      `Version ${version} available in pre-built locks: ${isAvailable}`
    );
    return isAvailable;
  }

  /**
   * Download Gemfile.lock content for a specific version
   */
  async fetchGemfileLock(version: string): Promise<string | null> {
    const url = `${this.baseUrl}/v${version}/Gemfile.lock`;
    core.debug(`Fetching Gemfile.lock for version ${version} from ${url}`);
    return this.fetchUrl(url);
  }

  /**
   * Download Gemfile content for a specific version
   */
  async fetchGemfile(version: string): Promise<string | null> {
    const url = `${this.baseUrl}/v${version}/Gemfile`;
    core.debug(`Fetching Gemfile for version ${version} from ${url}`);
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
