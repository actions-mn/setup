import {IMetanormaSettings} from '../metanorma-settings';
import {BaseInstaller} from './base-installer';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';
import * as path from 'path';
import * as exec from '@actions/exec';
import {Platform} from '../platform-detector';
import {getVersionStore} from '../version';
import type {BinaryProvider, BinaryPlatformArtifact} from '../version';

/**
 * Binary installer for packed-mn releases
 *
 * Downloads pre-compiled Metanorma binaries directly from GitHub releases.
 * This is the fastest installation method as it doesn't require package managers
 * or Ruby/Bundler.
 */
export class BinaryInstaller extends BaseInstaller {
  private tempFiles: string[] = [];

  /**
   * Install Metanorma using packed-mn binary
   */
  async install(settings: IMetanormaSettings): Promise<void> {
    core.startGroup('Installing Metanorma via binary (packed-mn)');

    try {
      const version = settings.version || 'latest';

      // Get the version store to fetch binary info
      const store = await getVersionStore();
      if (!store) {
        throw new Error('Failed to fetch version data for binary installation');
      }

      const binaryProvider = store.getBinaryProvider();

      // Resolve version
      const resolvedVersion = version === 'latest'
        ? binaryProvider.getLatest()
        : version;

      if (!resolvedVersion) {
        throw new Error(`Could not resolve version: ${version}`);
      }

      // Check if version is available
      if (!binaryProvider.isAvailable(resolvedVersion)) {
        const available = binaryProvider.getAvailableVersions().slice(-10).join(', ');
        throw new Error(
          `Version ${resolvedVersion} is not available as binary.\n` +
          `Available versions (last 10): ${available}`
        );
      }

      core.info(`Installing Metanorma ${resolvedVersion} via packed-mn binary`);

      // Get the best matching artifact for current platform
      const artifact = binaryProvider.getBestMatch(resolvedVersion);
      if (!artifact) {
        const platforms = binaryProvider.getPlatforms(resolvedVersion);
        throw new Error(
          `No binary available for current platform (${process.platform}/${process.arch}).\n` +
          `Available platforms: ${platforms.map(p => `${p.name}/${p.arch}`).join(', ')}`
        );
      }

      core.info(`Selected binary: ${artifact.filename} (${formatSize(artifact.size)})`);

      // Check if already cached
      const toolPath = tc.find('metanorma', resolvedVersion, artifact.arch);
      if (toolPath) {
        core.info(`Found cached binary at: ${toolPath}`);
        await this.addToPath(toolPath);
        await this.verifyInstallation();
        core.info('Metanorma installed successfully from cache');
        return;
      }

      // Download the binary
      const downloadPath = await this.downloadBinary(artifact, resolvedVersion);

      // Extract and install
      const installPath = await this.extractAndInstall(
        downloadPath,
        artifact,
        resolvedVersion
      );

      // Add to PATH
      await this.addToPath(installPath);

      // Verify installation
      await this.verifyInstallation();

      core.info(`Metanorma ${resolvedVersion} installed successfully via binary`);
    } finally {
      core.endGroup();
    }
  }

  /**
   * Download the binary file
   */
  private async downloadBinary(
    artifact: BinaryPlatformArtifact,
    version: string
  ): Promise<string> {
    core.info(`Downloading from: ${artifact.url}`);

    const downloadPath = await tc.downloadTool(artifact.url);
    this.tempFiles.push(downloadPath);

    core.debug(`Downloaded to: ${downloadPath}`);
    return downloadPath;
  }

  /**
   * Extract and install the binary
   */
  private async extractAndInstall(
    downloadPath: string,
    artifact: BinaryPlatformArtifact,
    version: string
  ): Promise<string> {
    let extractedPath: string;

    // Extract based on format
    if (artifact.format === 'zip' || artifact.format === 'exe') {
      // Windows uses zip or exe
      if (artifact.format === 'exe') {
        // exe is a self-extracting archive or direct binary
        const targetDir = path.join(process.env.RUNNER_TEMP || '/tmp', 'metanorma-binary');
        fs.mkdirSync(targetDir, {recursive: true});
        const targetPath = path.join(targetDir, 'metanorma.exe');
        fs.copyFileSync(downloadPath, targetPath);
        extractedPath = targetDir;
      } else {
        extractedPath = await tc.extractZip(downloadPath);
      }
    } else {
      // tgz for macOS/Linux
      extractedPath = await tc.extractTar(downloadPath);
    }

    this.tempFiles.push(extractedPath);
    core.debug(`Extracted to: ${extractedPath}`);

    // Find the binary in the extracted directory
    const binaryName = process.platform === 'win32' ? 'metanorma.exe' : 'metanorma';
    let binaryPath = path.join(extractedPath, binaryName);

    // Check if binary exists at root level
    if (!fs.existsSync(binaryPath)) {
      // Look for it in subdirectories
      const entries = fs.readdirSync(extractedPath, {withFileTypes: true});
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subBinaryPath = path.join(extractedPath, entry.name, binaryName);
          if (fs.existsSync(subBinaryPath)) {
            binaryPath = subBinaryPath;
            break;
          }
        }
      }
    }

    if (!fs.existsSync(binaryPath)) {
      throw new Error(`Binary not found after extraction: ${binaryPath}`);
    }

    // Make executable (Unix)
    if (process.platform !== 'win32') {
      fs.chmodSync(binaryPath, 0o755);
    }

    // Cache the tool
    const cachedPath = await tc.cacheFile(
      binaryPath,
      binaryName,
      'metanorma',
      version,
      artifact.arch
    );

    core.debug(`Cached to: ${cachedPath}`);
    return cachedPath;
  }

  /**
   * Add binary directory to PATH
   */
  private async addToPath(toolPath: string): Promise<void> {
    core.addPath(toolPath);
    core.info(`Added to PATH: ${toolPath}`);
  }

  /**
   * Verify Metanorma installation
   */
  private async verifyInstallation(): Promise<void> {
    core.info('Verifying installation...');

    const binaryName = process.platform === 'win32' ? 'metanorma.exe' : 'metanorma';
    const exitCode = await this.execCommand(binaryName, ['--version'], {
      silent: false,
      ignoreReturnCode: true
    });

    if (exitCode !== 0) {
      throw new Error('Metanorma installation verification failed');
    }

    core.info('Installation verified successfully');
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(): Promise<void> {
    for (const tempFile of this.tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.rmSync(tempFile, {recursive: true, force: true});
          core.debug(`Cleaned up: ${tempFile}`);
        }
      } catch (error) {
        core.warning(`Failed to cleanup ${tempFile}: ${error}`);
      }
    }
    this.tempFiles = [];
  }
}

/**
 * Format file size in human-readable format
 */
function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
