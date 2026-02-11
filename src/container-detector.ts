import * as fs from 'fs';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {InstallationMethod} from './platform-detector';

/**
 * Container type enumeration
 */
export type ContainerType = 'docker' | 'podman' | 'lxc' | 'none';

/**
 * Linux distribution enumeration
 */
export type LinuxDistribution = 'ubuntu' | 'debian' | 'alpine' | 'unknown';

/**
 * Container information interface
 */
export interface ContainerInfo {
  isContainer: boolean;
  type: ContainerType;
  hasRuby: boolean;
  hasMetanorma: boolean;
  distribution: LinuxDistribution;
}

/**
 * Detect if running in a container and gather container information
 */
export async function detectContainer(): Promise<ContainerInfo> {
  const info: ContainerInfo = {
    isContainer: false,
    type: 'none',
    hasRuby: false,
    hasMetanorma: false,
    distribution: 'unknown'
  };

  // Detect container type
  info.type = await detectContainerType();
  info.isContainer = info.type !== 'none';

  // Detect distribution (Linux only)
  if (process.platform === 'linux') {
    info.distribution = await detectDistribution();
  }

  // Check for Ruby
  info.hasRuby = await commandExists('ruby');

  // Check for Metanorma
  info.hasMetanorma = await commandExists('metanorma');

  core.debug(`Container detection result: ${JSON.stringify(info)}`);

  return info;
}

/**
 * Detect the type of container environment
 */
async function detectContainerType(): Promise<ContainerType> {
  // Check for Docker: .dockerenv file
  if (await fileExists('/.dockerenv')) {
    core.debug('Detected Docker container (via /.dockerenv)');
    return 'docker';
  }

  // Check cgroup for container indicators
  try {
    const cgroupPath = '/proc/1/cgroup';
    if (await fileExists(cgroupPath)) {
      const cgroupContent = await fs.promises.readFile(cgroupPath, 'utf-8');
      const cgroupLower = cgroupContent.toLowerCase();

      if (
        cgroupLower.includes('docker') ||
        cgroupLower.includes('containerd')
      ) {
        core.debug('Detected Docker container (via /proc/1/cgroup)');
        return 'docker';
      }
      if (cgroupLower.includes('podman')) {
        core.debug('Detected Podman container');
        return 'podman';
      }
      if (cgroupLower.includes('lxc')) {
        core.debug('Detected LXC container');
        return 'lxc';
      }
    }
  } catch (error) {
    core.debug(`Error reading cgroup: ${error}`);
  }

  core.debug('No container detected');
  return 'none';
}

/**
 * Detect Linux distribution
 */
async function detectDistribution(): Promise<LinuxDistribution> {
  // Check Alpine via /etc/alpine-release
  if (await fileExists('/etc/alpine-release')) {
    core.debug('Detected Alpine Linux distribution');
    return 'alpine';
  }

  // Check for /etc/os-release
  const osReleasePath = '/etc/os-release';
  if (await fileExists(osReleasePath)) {
    try {
      const osReleaseContent = await fs.promises.readFile(
        osReleasePath,
        'utf-8'
      );
      const osReleaseLower = osReleaseContent.toLowerCase();

      if (osReleaseLower.includes('ubuntu')) {
        core.debug('Detected Ubuntu distribution');
        return 'ubuntu';
      }
      if (osReleaseLower.includes('debian')) {
        core.debug('Detected Debian distribution');
        return 'debian';
      }
    } catch (error) {
      core.debug(`Error reading os-release: ${error}`);
    }
  }

  // Fallback to /etc/debian_version
  if (await fileExists('/etc/debian_version')) {
    core.debug('Detected Debian distribution (via /etc/debian_version)');
    return 'debian';
  }

  core.debug('Could not detect specific Linux distribution');
  return 'unknown';
}

/**
 * Get the installation method based on user preference and environment
 */
export async function getInstallationMethod(
  userPreference: string
): Promise<{method: InstallationMethod; reason: string}> {
  const preference = userPreference.toLowerCase() as InstallationMethod;

  // Explicit user preferences
  if (preference === InstallationMethod.Native) {
    return {
      method: InstallationMethod.Native,
      reason: 'User explicitly requested native package manager installation'
    };
  }

  if (preference === InstallationMethod.Gem) {
    return {
      method: InstallationMethod.Gem,
      reason: 'User explicitly requested gem-based installation'
    };
  }

  // Auto-detect
  const containerInfo = await detectContainer();

  if (containerInfo.isContainer) {
    return {
      method: InstallationMethod.Gem,
      reason: `Running in ${containerInfo.type} container with ${containerInfo.distribution} distribution - using gem-based installation`
    };
  }

  // Native OS - use native package manager by default
  return {
    method: InstallationMethod.Native,
    reason: 'Running on native OS - using native package manager'
  };
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a command exists
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    let output = '';
    let error = '';

    const options = {
      silent: true,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
        stderr: (data: Buffer) => {
          error += data.toString();
        }
      }
    };

    const exitCode = await exec.exec('command', ['-v', command], options);
    return exitCode === 0;
  } catch {
    return false;
  }
}
