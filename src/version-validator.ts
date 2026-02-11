import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

export interface AvailableVersions {
  snap: {
    stable: string | null;
    candidate: string | null;
    beta: string | null;
    edge: string | null;
    all: string[];
    lastUpdated: string | null;
  };
  chocolatey: {
    latest: string | null;
    all: string[];
    lastUpdated: string | null;
  };
  homebrew: {
    latest: string | null;
    all: string[];
    lastUpdated: string | null;
  };
  lastUpdated: string;
}

let versionsCache: AvailableVersions | null = null;

/**
 * Load available versions from versions.json
 */
export function loadAvailableVersions(): AvailableVersions | null {
  if (versionsCache) {
    return versionsCache;
  }

  const versionsPath = path.join(__dirname, '../versions.json');

  if (!fs.existsSync(versionsPath)) {
    core.warning('versions.json not found - version validation disabled');
    return null;
  }

  try {
    const content = fs.readFileSync(versionsPath, 'utf-8');
    versionsCache = JSON.parse(content) as AvailableVersions;
    return versionsCache;
  } catch (error) {
    core.warning(`Failed to load versions.json: ${error}`);
    return null;
  }
}

/**
 * Check if a version is available for the given installation method
 */
export function isVersionAvailable(
  version: string,
  installMethod: 'snap' | 'chocolatey' | 'homebrew' | 'gem'
): boolean {
  const versions = loadAvailableVersions();

  if (!versions) {
    // If we can't load versions, allow the installation
    return true;
  }

  // Gem method doesn't use native package managers
  if (installMethod === 'gem') {
    return true;
  }

  const source = versions[installMethod];
  if (!source) {
    core.warning(`Unknown install method: ${installMethod}`);
    return true;
  }

  // Check if version exists in the 'all' array
  return source.all.includes(version);
}

/**
 * Validate that a version is available and throw an error if not
 */
export function validateVersion(
  version: string,
  installMethod: 'snap' | 'chocolatey' | 'homebrew' | 'gem'
): void {
  if (version === 'latest' || !version) {
    return;
  }

  const versions = loadAvailableVersions();

  if (!versions) {
    core.warning('Version validation not available - proceeding anyway');
    return;
  }

  if (installMethod === 'gem') {
    return;
  }

  const source = versions[installMethod];
  if (!source) {
    return;
  }

  if (!source.all.includes(version)) {
    const available = source.all.slice(-10).join(', '); // Show last 10 versions
    throw new Error(
      `Version ${version} is not available via ${installMethod}.\n\n` +
        `Available versions (last 10): ${available}...\n\n` +
        `Please check versions.json for the complete list of available versions.\n\n` +
        `For gem-based installation, use installation-method: "gem" instead.`
    );
  }

  core.info(`✓ Version ${version} is available via ${installMethod}`);
}

/**
 * Get the latest version for an installation method
 */
export function getLatestVersion(
  installMethod: 'snap' | 'chocolatey' | 'homebrew'
): string | null {
  const versions = loadAvailableVersions();

  if (!versions) {
    return null;
  }

  const source = versions[installMethod];
  if (!source) {
    return null;
  }

  // Snap uses 'stable' instead of 'latest'
  if (installMethod === 'snap' && 'stable' in source) {
    return source.stable || null;
  }

  // Chocolatey and Homebrew use 'latest'
  if ('latest' in source) {
    return source.latest || null;
  }

  return null;
}

/**
 * Get available versions for an installation method
 */
export function getAvailableVersions(
  installMethod: 'snap' | 'chocolatey' | 'homebrew'
): string[] {
  const versions = loadAvailableVersions();

  if (!versions) {
    return [];
  }

  const source = versions[installMethod];
  if (!source) {
    return [];
  }

  return source.all;
}
