import type {IMetanormaSettings} from '../metanorma-settings.js';
import {BaseInstaller} from './base-installer.js';
import {startGroup, endGroup, info, debug, warning} from '@actions/core';
import {getVersionStore} from '../version/index.js';
import type {VersionDataStore, Architecture} from '../version/index.js';

interface SnapRevisionInfo {
  revision: number;
  channel: string;
  version: string;
}

/**
 * Map Node.js architecture to Snap architecture
 */
function mapNodeArchToSnapArch(nodeArch: string): Architecture {
  // Node.js returns 'x64' for amd64, 'arm64' for arm64
  switch (nodeArch) {
    case 'arm64':
    case 'aarch64':
      return 'arm64';
    case 'x64':
    case 'amd64':
    case 'x86_64':
    default:
      return 'amd64';
  }
}

/**
 * Linux Snap installer
 * Installs Metanorma using Snap package manager
 *
 * Snap installation methods:
 * 1. Revision-based: Install a specific revision for a version
 * 2. Channel-based: Install from a channel (stable, candidate, beta, edge)
 *
 * When a version is specified, the action will:
 * - Look up the revision number for that version from mnenv (if available)
 * - Install using --revision to pin that specific version
 * - Optionally track a channel for future updates
 *
 * If mnenv is not available, falls back to channel-based installation.
 */
export class SnapInstaller extends BaseInstaller {
  private versionStorePromise: Promise<VersionDataStore | null> | null = null;

  /**
   * Get the architecture-specific revision for a version
   * Returns null if version store is not available or version not found.
   */
  private async getRevisionForVersion(
    version: string
  ): Promise<{revision: number; channel: string} | null> {
    const store = await this.getVersionStore();
    if (!store) {
      debug('Version store not available, cannot look up revision');
      return null;
    }

    const provider = store.getSnapProvider();

    if (!provider.isAvailable(version)) {
      warning(`Version ${version} is not available in snap versions`);
      return null;
    }

    // Map Node.js arch to snap arch
    const snapArch: Architecture = mapNodeArchToSnapArch(process.arch);

    const revision = provider.getRevision(version, snapArch);
    const channel = provider.getChannel(version, snapArch);

    if (!revision || !channel) {
      warning(`No revision found for version ${version} on ${snapArch}`);
      return null;
    }

    return {revision, channel};
  }

  private getVersionStore(): Promise<VersionDataStore | null> {
    if (!this.versionStorePromise) {
      this.versionStorePromise = getVersionStore();
    }
    return this.versionStorePromise;
  }

  async install(settings: IMetanormaSettings): Promise<void> {
    startGroup('Installing Metanorma via Snap');

    try {
      let args: string[] = ['snap', 'install', 'metanorma'];

      if (settings.version) {
        // Try version-based installation using revision pinning from mnenv
        const revisionInfo = await this.getRevisionForVersion(settings.version);

        if (revisionInfo) {
          info(
            `Installing Metanorma version ${settings.version} ` +
              `(revision ${revisionInfo.revision}, channel: ${revisionInfo.channel})...`
          );

          // Install with revision pinning
          args.push(`--revision=${revisionInfo.revision}`, '--classic');

          const exitCode = await this.execCommand('sudo', args);

          if (exitCode !== 0) {
            throw new Error(
              `Snap installation failed with exit code ${exitCode}`
            );
          }

          // Optionally hold the revision to prevent auto-refresh
          // This ensures the specific version stays installed
          info(`Holding Metanorma at revision ${revisionInfo.revision}...`);
          await this.execCommand('snap', ['refresh', 'metanorma', '--hold'], {
            ignoreReturnCode: true
          });

          info(
            `✓ Metanorma ${settings.version} installed successfully via Snap ` +
              `(revision ${revisionInfo.revision}, held at this version)`
          );
          return;
        }

        // Fall through to channel-based if revision not found or mnenv unavailable
        info(
          `Revision lookup not available for version ${settings.version}, ` +
            `using channel-based installation`
        );
      }

      // Channel-based installation (latest or when version not found/mnenv unavailable)
      if (settings.version) {
        const channel = `${settings.snapChannel}`;
        info(
          `Installing Metanorma from ${channel} channel ` +
            `(version ${settings.version} requested, using channel for installation)...`
        );
        args.push(`--channel=${channel}`, '--classic');
      } else {
        info('Installing Metanorma latest from stable channel...');
        args.push('--classic');
      }

      const exitCode = await this.execCommand('sudo', args);

      if (exitCode !== 0) {
        throw new Error(`Snap installation failed with exit code ${exitCode}`);
      }

      info('✓ Metanorma installed successfully via Snap');
    } finally {
      endGroup();
    }
  }

  async cleanup(): Promise<void> {
    // Snap doesn't require cleanup
    debug('Snap installer: No cleanup needed');
  }
}
