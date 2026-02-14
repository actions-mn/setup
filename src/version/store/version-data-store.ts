import {warning, info} from '@actions/core';
import {MnenvYamlFetcher} from '../client/mnenv-yaml-fetcher.js';
import type {MnenvAllVersions} from '../types/mnenv-types.js';
import {SnapProvider} from '../providers/snap-provider.js';
import {GemfileProvider} from '../providers/gemfile-provider.js';
import {HomebrewProvider} from '../providers/homebrew-provider.js';
import {ChocolateyProvider} from '../providers/chocolatey-provider.js';
import {BinaryProvider} from '../providers/binary-provider.js';
import type {IVersionProvider, Platform} from '../types/provider-types.js';

/**
 * VersionDataStore manages version data for all platforms.
 *
 * Responsibilities:
 * - Fetch version data from metanorma/versions YAML files via HTTPS
 * - Create and cache platform-specific providers
 * - Provide typed access to each platform's provider
 * - No Ruby/Bundler/git needed - pure TypeScript implementation
 *
 * @sealed This class uses a singleton pattern and should not be extended.
 */
export class VersionDataStore {
  private static instance: VersionDataStore | null = null;
  private fetcher: MnenvYamlFetcher;
  private providers: Map<Platform, IVersionProvider>;
  private isInitialized = false;
  private initializationFailed = false;

  private constructor() {
    this.fetcher = new MnenvYamlFetcher();
    this.providers = new Map();
  }

  /**
   * Get the singleton instance.
   * Returns null if initialization fails.
   */
  static async getInstance(): Promise<VersionDataStore | null> {
    if (!VersionDataStore.instance) {
      VersionDataStore.instance = new VersionDataStore();
      const success = await VersionDataStore.instance.initialize();
      if (!success) {
        VersionDataStore.instance = null;
        return null;
      }
    }
    return VersionDataStore.instance;
  }

  /**
   * Initialize the store by fetching data from YAML files.
   * Returns true if successful, false otherwise.
   */
  private async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationFailed) {
      warning('VersionDataStore previously failed initialization');
      return false;
    }

    info('Initializing VersionDataStore...');

    const mnenvData = await this.fetcher.fetchAllVersions();
    if (!mnenvData) {
      this.initializationFailed = true;
      warning(
        'Failed to fetch versions from YAML, version data will not be available'
      );
      return false;
    }

    // Create providers for each platform
    this.providers.set('snap', new SnapProvider(mnenvData));
    this.providers.set('gemfile', new GemfileProvider(mnenvData));
    this.providers.set('homebrew', new HomebrewProvider(mnenvData));
    this.providers.set('chocolatey', new ChocolateyProvider(mnenvData));
    this.providers.set('binary', new BinaryProvider(mnenvData));

    this.isInitialized = true;
    info('VersionDataStore initialized successfully');
    return true;
  }

  /**
   * Get provider for a specific platform.
   * @throws Error if store is not initialized
   */
  getProvider(platform: Platform): IVersionProvider {
    this.ensureInitialized();

    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    return provider;
  }

  /**
   * Get snap provider (typed).
   * @throws Error if store is not initialized
   */
  getSnapProvider(): SnapProvider {
    return this.getProvider('snap') as SnapProvider;
  }

  /**
   * Get gemfile provider (typed).
   * @throws Error if store is not initialized
   */
  getGemfileProvider(): GemfileProvider {
    return this.getProvider('gemfile') as GemfileProvider;
  }

  /**
   * Get homebrew provider (typed).
   * @throws Error if store is not initialized
   */
  getHomebrewProvider(): HomebrewProvider {
    return this.getProvider('homebrew') as HomebrewProvider;
  }

  /**
   * Get chocolatey provider (typed).
   * @throws Error if store is not initialized
   */
  getChocolateyProvider(): ChocolateyProvider {
    return this.getProvider('chocolatey') as ChocolateyProvider;
  }

  /**
   * Get binary provider (typed).
   * @throws Error if store is not initialized
   */
  getBinaryProvider(): BinaryProvider {
    return this.getProvider('binary') as BinaryProvider;
  }

  /**
   * Clean up resources (no-op for YAML fetcher, kept for API compatibility).
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for YAML fetcher
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('VersionDataStore not initialized');
    }
  }
}
