/**
 * Version management module.
 *
 * Provides unified access to Metanorma version information
 * across all platforms (gemfile, snap, homebrew, chocolatey, binary).
 *
 * @example
 * ```typescript
 * import { getVersionStore } from './version/index.js';
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

export {VersionDataStore} from './store/version-data-store.js';
export {MnenvYamlFetcher} from './client/mnenv-yaml-fetcher.js';

// Providers
export {VersionProvider} from './providers/version-provider.js';
export {SnapProvider} from './providers/snap-provider.js';
export {GemfileProvider} from './providers/gemfile-provider.js';
export {HomebrewProvider} from './providers/homebrew-provider.js';
export {ChocolateyProvider} from './providers/chocolatey-provider.js';
export {BinaryProvider} from './providers/binary-provider.js';

// Types
export * from './types/platform-types.js';
export * from './types/provider-types.js';
export * from './types/mnenv-types.js';

// Convenience function
import {VersionDataStore} from './store/version-data-store.js';

/**
 * Get the singleton VersionDataStore instance.
 * This is the main entry point for version data access.
 * Returns null if initialization fails (YAML fetch failed).
 */
export async function getVersionStore(): Promise<VersionDataStore | null> {
  return VersionDataStore.getInstance();
}
