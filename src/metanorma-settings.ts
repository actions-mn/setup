import {Platform, InstallationMethod} from './platform-detector';
import {ContainerInfo} from './container-detector';

/**
 * Metanorma installation settings interface
 */
export interface IMetanormaSettings {
  /**
   * The version of Metanorma to install
   * null indicates latest version
   */
  version: string | null;

  /**
   * The Snap channel to use for installation (stable/edge/beta)
   * Only applicable for Linux/Snap
   */
  snapChannel: string;

  /**
   * Whether to install pre-release versions from Chocolatey
   * Only applicable for Windows
   */
  chocoPrerelease: boolean;

  /**
   * The detected platform
   */
  platform: Platform;

  /**
   * Installation path (where Metanorma will be installed)
   */
  installPath: string;

  /**
   * Installation method (auto/native/gem)
   */
  installationMethod: InstallationMethod;

  /**
   * Container information (only available on Linux)
   */
  containerInfo?: ContainerInfo;

  /**
   * Bundler version for gem-based installation
   */
  bundlerVersion?: string;

  /**
   * Custom Gemfile path for gem-based installation
   */
  gemfile?: string;

  /**
   * Whether to update fontist formulas after gem installation
   */
  fontistUpdate?: boolean;

  /**
   * Whether to update dependencies while keeping metanorma-cli version pinned
   */
  bundleUpdate?: boolean;

  /**
   * Whether to use pre-built Gemfile.lock files from metanorma-gemfile-locks
   */
  usePrebuiltLocks?: boolean;
}
