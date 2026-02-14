import {info, warning, debug} from '@actions/core';
import * as https from 'https';
import type {MnenvAllVersions} from '../types/mnenv-types.js';
import * as yaml from 'js-yaml';

/**
 * MnenvYamlFetcher fetches version data from metanorma/versions repository YAML files.
 *
 * This approach eliminates the need for Ruby/Bundler by fetching
 * pre-built YAML files directly from GitHub.
 *
 * YAML files are located at:
 * https://raw.githubusercontent.com/metanorma/versions/main/data/{platform}/versions.yaml
 */
export class MnenvYamlFetcher {
  private readonly RAW_BASE_URL =
    'https://raw.githubusercontent.com/metanorma/versions/main/data';
  private readonly TIMEOUT_MS = 30 * 1000; // 30 seconds

  /**
   * Fetch all platform version data from YAML files.
   * Returns null if fetching fails.
   */
  async fetchAllVersions(): Promise<MnenvAllVersions | null> {
    try {
      info('Fetching version data from YAML files...');

      const [snapData, gemfileData, homebrewData, chocolateyData, binaryData] =
        await Promise.all([
          this.fetchYamlFile('snap/versions.yaml'),
          this.fetchYamlFile('gemfile/versions.yaml'),
          this.fetchYamlFile('homebrew/versions.yaml'),
          this.fetchYamlFile('chocolatey/versions.yaml'),
          this.fetchYamlFile('binary/versions.yaml')
        ]);

      const result: MnenvAllVersions = {
        snap: this.transformSnapData(snapData),
        gemfile: this.transformGemfileData(gemfileData),
        homebrew: this.transformHomebrewData(homebrewData),
        chocolatey: this.transformChocolateyData(chocolateyData),
        binary: this.transformBinaryData(binaryData)
      };

      this.logSummary(result);
      return result;
    } catch (error) {
      warning(`Failed to fetch YAML version data: ${error}`);
      return null;
    }
  }

  /**
   * Fetch a single YAML file from GitHub.
   */
  private async fetchYamlFile(path: string): Promise<any> {
    const url = `${this.RAW_BASE_URL}/${path}`;
    debug(`Fetching: ${url}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${url}`));
      }, this.TIMEOUT_MS);

      https
        .get(url, res => {
          clearTimeout(timeout);

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            return;
          }

          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const parsed = yaml.load(data);
              resolve(parsed);
            } catch (error) {
              reject(new Error(`Failed to parse YAML from ${url}: ${error}`));
            }
          });
        })
        .on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Transform snap YAML data to MnenvSnapPlatformData format.
   */
  private transformSnapData(data: any): any {
    if (!data || !data.versions) {
      return {count: 0, latest: '', versions: []};
    }

    return {
      count: data.metadata?.count || data.versions.length,
      latest: data.metadata?.latest_version || '',
      versions: data.versions.map((v: any) => ({
        version: v.version,
        revision: v.revision,
        channel: v.channel,
        arch: v.arch,
        published_at: v.published_at || null,
        parsed_at: v.parsed_at || null,
        display_name: v.display_name || v.version
      }))
    };
  }

  /**
   * Transform gemfile YAML data to MnenvGemfilePlatformData format.
   */
  private transformGemfileData(data: any): any {
    if (!data || !data.versions) {
      return {count: 0, latest: '', versions: []};
    }

    return {
      count: data.metadata?.count || data.versions.length,
      latest: data.metadata?.latest_version || '',
      versions: data.versions.map((v: any) => ({
        version: v.version,
        gemfile_exists: v.gemfile_exists || true,
        published_at: v.published_at || null,
        parsed_at: v.parsed_at || null,
        display_name: v.display_name || v.version
      }))
    };
  }

  /**
   * Transform homebrew YAML data to MnenvHomebrewPlatformData format.
   */
  private transformHomebrewData(data: any): any {
    if (!data || !data.versions) {
      return {count: 0, latest: '', versions: []};
    }

    return {
      count: data.metadata?.count || data.versions.length,
      latest: data.metadata?.latest_version || '',
      versions: data.versions.map((v: any) => ({
        version: v.version,
        tag_name: v.tag_name,
        commit_sha: v.commit_sha,
        published_at: v.published_at || null,
        parsed_at: v.parsed_at || null,
        display_name: v.display_name || v.version
      }))
    };
  }

  /**
   * Transform chocolatey YAML data to MnenvChocolateyPlatformData format.
   */
  private transformChocolateyData(data: any): any {
    if (!data || !data.versions) {
      return {count: 0, latest: '', versions: []};
    }

    return {
      count: data.metadata?.count || data.versions.length,
      latest: data.metadata?.latest_version || '',
      versions: data.versions.map((v: any) => ({
        version: v.version,
        package_name: v.package_name,
        is_pre_release: v.is_pre_release || false,
        published_at: v.published_at || null,
        parsed_at: v.parsed_at || null,
        display_name: v.display_name || v.version
      }))
    };
  }

  /**
   * Transform binary YAML data to MnenvBinaryPlatformData format.
   */
  private transformBinaryData(data: any): any {
    if (!data || !data.versions) {
      return {count: 0, latest: '', versions: []};
    }

    return {
      count: data.metadata?.count || data.versions.length,
      latest: data.metadata?.latest_version || '',
      versions: data.versions.map((v: any) => ({
        version: v.version,
        tag_name: v.tag_name,
        html_url: v.html_url,
        published_at: v.published_at || null,
        parsed_at: v.parsed_at || null,
        display_name: v.display_name || v.version,
        platforms: (v.platforms || []).map((p: any) => ({
          name: p.name,
          arch: p.arch,
          format: p.format,
          filename: p.filename,
          url: p.url,
          size: p.size,
          variant: p.variant
        }))
      }))
    };
  }

  /**
   * Log summary of fetched version data.
   */
  private logSummary(data: MnenvAllVersions): void {
    info('Version data loaded:');
    info(
      `  Gemfile: ${data.gemfile.count} versions (latest: ${data.gemfile.latest})`
    );
    info(`  Snap: ${data.snap.count} versions (latest: ${data.snap.latest})`);
    info(
      `  Homebrew: ${data.homebrew.count} versions (latest: ${data.homebrew.latest})`
    );
    info(
      `  Chocolatey: ${data.chocolatey.count} versions (latest: ${data.chocolatey.latest})`
    );
    info(
      `  Binary: ${data.binary.count} versions (latest: ${data.binary.latest})`
    );
  }
}
