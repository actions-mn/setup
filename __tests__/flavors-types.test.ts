import {describe, it, expect} from 'vitest';
import {
  isPrivateFlavor,
  getFlavorGemName,
  PRIVATE_FLAVORS
} from '../src/flavors/types.js';

describe('Flavor Types', () => {
  describe('PRIVATE_FLAVORS', () => {
    it('should contain bsi and nist only', () => {
      expect(PRIVATE_FLAVORS).toContain('bsi');
      expect(PRIVATE_FLAVORS).toContain('nist');
      expect(PRIVATE_FLAVORS.length).toBe(2);
    });
  });

  describe('isPrivateFlavor', () => {
    it('should return true for private flavors', () => {
      expect(isPrivateFlavor('bsi')).toBe(true);
      expect(isPrivateFlavor('nist')).toBe(true);
    });

    it('should return false for public flavors', () => {
      expect(isPrivateFlavor('iso')).toBe(false);
      expect(isPrivateFlavor('ietf')).toBe(false);
      expect(isPrivateFlavor('ribose')).toBe(false);
      expect(isPrivateFlavor('cc')).toBe(false);
      expect(isPrivateFlavor('plateau')).toBe(false);
    });

    it('should return false for unknown flavors', () => {
      expect(isPrivateFlavor('unknown')).toBe(false);
      expect(isPrivateFlavor('')).toBe(false);
    });
  });

  describe('getFlavorGemName', () => {
    it('should return metanorma-{flavor} for flavor names', () => {
      expect(getFlavorGemName('bsi')).toBe('metanorma-bsi');
      expect(getFlavorGemName('nist')).toBe('metanorma-nist');
      expect(getFlavorGemName('iso')).toBe('metanorma-iso');
      expect(getFlavorGemName('ietf')).toBe('metanorma-ietf');
    });

    it('should handle empty string', () => {
      expect(getFlavorGemName('')).toBe('metanorma-');
    });
  });
});
