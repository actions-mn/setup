/**
 * Flavors module for installing extra metanorma flavor gems
 *
 * This module provides functionality to install both public and private
 * metanorma flavor gems. Private flavors (bsi, nist, plateau) require
 * GitHub Packages authentication.
 */

export {FlavorInstaller, configureGitHubPackages} from './flavor-installer.js';
export {isPrivateFlavor, getFlavorGemName, PRIVATE_FLAVORS} from './types.js';
