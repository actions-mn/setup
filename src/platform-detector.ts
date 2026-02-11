/**
 * Platform enum for Metanorma installation
 */
export enum Platform {
  MacOS = 'darwin',
  Linux = 'linux',
  Windows = 'win32'
}

/**
 * Installation method enumeration
 */
export enum InstallationMethod {
  Auto = 'auto',
  Native = 'native',
  Gem = 'gem'
}

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
  const platform = process.platform;
  switch (platform) {
    case 'darwin':
      return Platform.MacOS;
    case 'linux':
      return Platform.Linux;
    case 'win32':
      return Platform.Windows;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return process.platform === 'darwin';
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return process.platform === 'linux';
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}
