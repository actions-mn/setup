import {describe, it, expect, beforeEach, vi} from 'vitest';
import {GemfileLocksFetcher, GemfileLocksIndex} from '../src/gemfile-locks';

describe('GemfileLocksFetcher', () => {
  let fetcher: GemfileLocksFetcher;

  beforeEach(() => {
    fetcher = new GemfileLocksFetcher();
    vi.clearAllMocks();
  });

  describe('parseYaml', () => {
    it('should parse valid index.yaml', () => {
      const yamlContent = `
metadata:
  generated_at: '2025-01-15'
  local_count: 5
  remote_count: 10
  latest_version: '1.14.4'

versions:
  - version: '1.14.4'
    updated_at: '2025-01-15'
  - version: '1.14.3'
    updated_at: '2025-01-10'

missing_versions:
  - '1.0.0'
  - '0.9.0'
`;

      // Access private method through type assertion for testing
      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml(yamlContent) as GemfileLocksIndex;

      expect(result).not.toBeNull();
      expect(result?.metadata.generated_at).toBe('2025-01-15');
      expect(result?.metadata.local_count).toBe(5);
      expect(result?.metadata.remote_count).toBe(10);
      expect(result?.metadata.latest_version).toBe('1.14.4');
      expect(result?.versions).toHaveLength(2);
      expect(result?.versions[0].version).toBe('1.14.4');
      expect(result?.versions[1].version).toBe('1.14.3');
      expect(result?.missing_versions).toHaveLength(2);
      expect(result?.missing_versions[0]).toBe('1.0.0');
    });

    it('should handle empty YAML', () => {
      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml('');

      expect(result).not.toBeNull();
      expect(result?.versions).toHaveLength(0);
      expect(result?.missing_versions).toHaveLength(0);
    });

    it('should handle YAML with comments', () => {
      const yamlContent = `
# This is a comment
metadata:
  generated_at: '2025-01-15'
  local_count: 3

versions:
  - version: '1.14.3'
    updated_at: '2025-01-10'
`;

      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml(yamlContent) as GemfileLocksIndex;

      expect(result).not.toBeNull();
      expect(result?.metadata.local_count).toBe(3);
      expect(result?.versions).toHaveLength(1);
      expect(result?.versions[0].version).toBe('1.14.3');
    });

    it('should handle YAML with missing_versions section', () => {
      const yamlContent = `
metadata:
  generated_at: '2025-01-15'
  local_count: 0
  remote_count: 0
  latest_version: '1.14.3'

versions:
  - version: '1.14.3'
    updated_at: '2025-01-10'

missing_versions:
  - '1.0.0'
  - '0.9.0'
  - '0.8.0'
`;

      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml(yamlContent) as GemfileLocksIndex;

      expect(result).not.toBeNull();
      expect(result?.versions).toHaveLength(1);
      expect(result?.missing_versions).toHaveLength(3);
      expect(result?.missing_versions).toEqual(['1.0.0', '0.9.0', '0.8.0']);
    });

    it('should handle single version entry', () => {
      const yamlContent = `
metadata:
  generated_at: '2025-01-15'
  local_count: 1
  remote_count: 1
  latest_version: '1.14.3'

versions:
  - version: '1.14.3'
    updated_at: '2025-01-10'

missing_versions: []
`;

      const parseYaml = (fetcher as any).parseYaml.bind(fetcher);
      const result = parseYaml(yamlContent) as GemfileLocksIndex;

      expect(result).not.toBeNull();
      expect(result?.versions).toHaveLength(1);
      expect(result?.versions[0].version).toBe('1.14.3');
      expect(result?.versions[0].updated_at).toBe('2025-01-10');
    });

    it('should handle version without quotes', () => {
      const yamlContent = `
metadata:
  generated_at: '2025-01-15'
  local_count: 1
  remote_count: 1
  latest_version: 1.14.3

versions:
  - version: 1.14.3
    updated_at: 2025-01-10

missing_versions: []
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
  });

  describe('constructor', () => {
    it('should initialize with correct base URL', () => {
      expect((fetcher as any).baseUrl).toBe(
        'https://raw.githubusercontent.com/metanorma/metanorma-gemfile-locks/main'
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
