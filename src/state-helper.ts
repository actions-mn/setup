import * as core from '@actions/core';

/**
 * Indicates whether the POST action is running
 */
export const IsPost = !!core.getState('isPost');

/**
 * The temporary files created during installation for cleanup
 */
export const TempFiles = JSON.parse(core.getState('tempFiles') || '[]');

/**
 * Save a temporary file path for cleanup
 */
export function saveTempFile(filePath: string): void {
  const tempFiles = TempFiles;
  tempFiles.push(filePath);
  core.saveState('tempFiles', JSON.stringify(tempFiles));
}

/**
 * Save the temporary files array
 */
export function saveTempFiles(files: string[]): void {
  core.saveState('tempFiles', JSON.stringify(files));
}

/**
 * Clear the temporary files state
 */
export function clearTempFiles(): void {
  core.saveState('tempFiles', '[]');
}

/**
 * Save the installation path for post-action cleanup
 */
export function saveInstallPath(installPath: string): void {
  core.saveState('installPath', installPath);
}

/**
 * Get the installation path
 */
export function getInstallPath(): string {
  return core.getState('installPath');
}

// Publish a variable so that when the POST action runs, it can determine it should run the cleanup logic.
// This is necessary since we don't have a separate entry point.
if (!IsPost) {
  core.saveState('isPost', 'true');
}
