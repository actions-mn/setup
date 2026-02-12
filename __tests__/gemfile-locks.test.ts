import {describe, it, expect, beforeEach, vi} from 'vitest';
import {GemfileLocksFetcher, GemfileLocksIndex} from '../src/gemfile-locks';

describe('GemfileLocksFetcher', () => {
  let fetcher: GemfileLocksFetcher;

  beforeEach(() => {
    fetcher = new GemfileLocksFetcher();
    vi.clearAllMocks();
  });

  describe('parseYaml', () => {
    it('should parse valid versions.yaml', () => {
      const yamlContent = `
metadata:
  generated_at: '2026-02-10T11:30:18Z'
  source: :gemfile
  count: 124
  latest_version: 1.14.4

versions:
  - version: '1.14.4'
    published_at: '2025-12-03T09:52:26Z'
    parsed_at:
    gemfile_exists: true
    gemfile_path: data/gemfile/v1.14.4/Gemfile
    gemfile_lock_path: data/gemfile/v1.14.4/Gemfile.lock.archived
  - version: '1.14.3'
    published_at:
    parsed_at:
    gemfile_exists: false
    gemfile_path:
    gemfile_lock_path:
`;

      // Access private method through type assertion for testing
      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml(yamlContent) as GemfileLocksIndex;

      expect(result).not.toBeNull();
      expect(result?.metadata.generated_at).toBe('2026-02-10T11:30:18Z');
      expect(result?.metadata.source).toBe('gemfile');
      expect(result?.metadata.count).toBe(124);
      expect(result?.metadata.latest_version).toBe('1.14.4');
      expect(result?.versions).toHaveLength(2);
      expect(result?.versions[0].version).toBe('1.14.4');
      expect(result?.versions[0].gemfile_exists).toBe(true);
      expect(result?.versions[1].version).toBe('1.14.3');
      expect(result?.versions[1].gemfile_exists).toBe(false);
    });

    it('should handle empty YAML', () => {
      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml('');

      expect(result).not.toBeNull();
      expect(result?.versions).toHaveLength(0);
    });

    it('should handle YAML with comments', () => {
      const yamlContent = `
# This is a comment
metadata:
  generated_at: '2026-02-10T11:30:18Z'
  source: :gemfile
  count: 3
  latest_version: '1.14.3'

versions:
  - version: '1.14.3'
    published_at:
    parsed_at:
    gemfile_exists: false
    gemfile_path:
    gemfile_lock_path:
`;

      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml(yamlContent) as GemfileLocksIndex;

      expect(result).not.toBeNull();
      expect(result?.metadata.count).toBe(3);
      expect(result?.versions).toHaveLength(1);
      expect(result?.versions[0].version).toBe('1.14.3');
    });

    it('should handle version with gemfile_exists true', () => {
      const yamlContent = `
metadata:
  generated_at: '2026-02-10T11:30:18Z'
  source: :gemfile
  count: 1
  latest_version: '1.14.3'

versions:
  - version: '1.14.3'
    published_at: '2025-01-10T00:00:00Z'
    parsed_at: '2026-02-10T08:03:18Z'
    gemfile_exists: true
    gemfile_path: data/gemfile/v1.14.3/Gemfile
    gemfile_lock_path: data/gemfile/v1.14.3/Gemfile.lock.archived
`;

      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml(yamlContent) as GemfileLocksIndex;

      expect(result).not.toBeNull();
      expect(result?.versions).toHaveLength(1);
      expect(result?.versions[0].version).toBe('1.14.3');
      expect(result?.versions[0].published_at).toBe('2025-01-10T00:00:00Z');
      expect(result?.versions[0].gemfile_exists).toBe(true);
      expect(result?.versions[0].gemfile_path).toBe(
        'data/gemfile/v1.14.3/Gemfile'
      );
    });

    it('should handle version without quotes', () => {
      const yamlContent = `
metadata:
  generated_at: '2026-02-10T11:30:18Z'
  source: :gemfile
  count: 1
  latest_version: 1.14.3

versions:
  - version: 1.14.3
    published_at:
    parsed_at:
    gemfile_exists: false
    gemfile_path:
    gemfile_lock_path:
`;

      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml(yamlContent) as GemfileLocksIndex;

      expect(result).not.toBeNull();
      expect(result?.metadata.latest_version).toBe('1.14.3');
      expect(result?.versions).toHaveLength(1);
      expect(result?.versions[0].version).toBe('1.14.3');
    });
  });

  describe('isVersionAvailable', () => {
    it('should return false when version list is empty', async () => {
      // Mock the fetchUrl to return null (network error)
      const fetchUrl = vi
        .spyOn(fetcher as any, 'fetchUrl')
        .mockResolvedValue(null);

      const isAvailable = await fetcher.isVersionAvailable('1.14.3');

      expect(isAvailable).toBe(false);
      fetchUrl.mockRestore();
    });

    it('should return false when gemfile fetch fails', async () => {
      // isVersionAvailable now tries to fetch the Gemfile file directly
      const fetchUrl = vi
        .spyOn(fetcher as any, 'fetchUrl')
        .mockResolvedValue(null);

      const isAvailable = await fetcher.isVersionAvailable('1.14.3');

      expect(isAvailable).toBe(false);
      fetchUrl.mockRestore();
    });

    it('should return true when gemfile fetch succeeds', async () => {
      // isVersionAvailable tries to fetch the Gemfile file directly
      const gemfileContent = `source "https://rubygems.org"
gem "metanorma-cli", "= 1.14.3"
`;
      const fetchUrl = vi
        .spyOn(fetcher as any, 'fetchUrl')
        .mockResolvedValue(gemfileContent);

      const isAvailable = await fetcher.isVersionAvailable('1.14.3');

      expect(isAvailable).toBe(true);
      fetchUrl.mockRestore();
    });
  });

  describe('constructor', () => {
    it('should initialize with correct base URL', () => {
      expect((fetcher as any).baseUrl).toBe(
        'https://raw.githubusercontent.com/metanorma/versions/main/data/gemfile'
      );
    });

    it('should initialize with null cache', () => {
      expect((fetcher as any).indexCache).toBeNull();
    });
  });

  describe('getLatestVersion', () => {
    it('should return null when index fetch fails', async () => {
      // Mock the fetchUrl to return null (network error)
      const fetchUrl = vi
        .spyOn(fetcher as any, 'fetchUrl')
        .mockResolvedValue(null);

      const result = await fetcher.getLatestVersion();

      expect(result).toBeNull();
      fetchUrl.mockRestore();
    });
  });

  describe('getAvailableVersions', () => {
    it('should return empty array when index fetch fails', async () => {
      // Mock the fetchUrl to return null (network error)
      const fetchUrl = vi
        .spyOn(fetcher as any, 'fetchUrl')
        .mockResolvedValue(null);

      const result = await fetcher.getAvailableVersions();

      expect(result).toEqual([]);
      fetchUrl.mockRestore();
    });
  });
});
