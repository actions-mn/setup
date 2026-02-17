/**
 * List of private flavor gems that require GitHub Packages authentication
 * These flavors are hosted at rubygems.pkg.github.com/metanorma
 */
export const PRIVATE_FLAVORS: readonly string[] = ['bsi', 'nist'] as const;

/**
 * Check if a flavor is a private flavor that requires GitHub Packages authentication
 * @param flavor - The flavor name (e.g., 'bsi', 'nist', 'ribose')
 * @returns true if the flavor is private and requires authentication
 */
export function isPrivateFlavor(flavor: string): boolean {
  return PRIVATE_FLAVORS.includes(flavor as (typeof PRIVATE_FLAVORS)[number]);
}

/**
 * Get the gem name for a flavor
 * @param flavor - The flavor name (e.g., 'bsi', 'nist')
 * @returns The gem name (e.g., 'metanorma-bsi')
 */
export function getFlavorGemName(flavor: string): string {
  return `metanorma-${flavor}`;
}
