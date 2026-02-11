/**
 * Version management module.
 *
 * Provides unified access to Metanorma version information
 * across all platforms (gemfile, snap, homebrew, chocolatey).
 *
 * @example
 * ```typescript
 * import { getVersionStore } from './version';
 *
 * const store = await getVersionStore();
 * const snapProvider = store.getSnapProvider();
 *
 * if (snapProvider.isAvailable('1.14.3')) {
 *   const revision = snapProvider.getRevision('1.14.3', 'amd64');
 *   console.log(`Revision: ${revision}`);
 * }
 *
 * await store.cleanup();
 * ```
 */

export { VersionDataStore } from './store/version-data-store';
export { MnenvYamlFetcher } from './client/mnenv-yaml-fetcher';

// Providers
export { VersionProvider } from './providers/version-provider';
export { SnapProvider } from './providers/snap-provider';
export { GemfileProvider } from './providers/gemfile-provider';
export { HomebrewProvider } from './providers/homebrew-provider';
export { ChocolateyProvider } from './providers/chocolatey-provider';

// Types
export * from './types/platform-types';
export * from './types/provider-types';
export * from './types/mnenv-types';

// Convenience function
import { VersionDataStore } from './store/version-data-store';

/**
 * Get the singleton VersionDataStore instance.
 * This is the main entry point for version data access.
 * Returns null if initialization fails (YAML fetch failed).
 */
export async function getVersionStore(): Promise<VersionDataStore | null> {
  return VersionDataStore.getInstance();
}
