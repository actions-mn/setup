import {Platform} from './platform-detector';

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
}
