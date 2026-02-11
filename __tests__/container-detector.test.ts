import {describe, it, beforeEach, vi, expect, Mock} from 'vitest';
import * as fs from 'fs';
import * as exec from '@actions/exec';
import {
  detectContainer,
  getInstallationMethod
} from '../src/container-detector';
import {InstallationMethod} from '../src/platform-detector';

vi.mock('fs');
vi.mock('@actions/exec');

describe('ContainerDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectContainer', () => {
    it('should detect Docker container via .dockerenv', async () => {
      vi.spyOn(fs.promises, 'access').mockResolvedValue(undefined as never);
      vi.mocked(exec.exec).mockResolvedValue(0);

      const result = await detectContainer();

      expect(result.isContainer).toBe(true);
      expect(result.type).toBe('docker');
    });

    it('should detect no container when not in container', async () => {
      vi.spyOn(fs.promises, 'access').mockRejectedValue({} as never);
      vi.spyOn(fs.promises, 'readFile').mockRejectedValue({} as never);
      vi.mocked(exec.exec).mockResolvedValue(0);

      const result = await detectContainer();

      expect(result.isContainer).toBe(false);
      expect(result.type).toBe('none');
    });
  });

  describe('getInstallationMethod', () => {
    it('should return native when explicitly requested', async () => {
      vi.spyOn(fs.promises, 'access').mockRejectedValue({} as never);
      vi.spyOn(fs.promises, 'readFile').mockRejectedValue({} as never);
      vi.mocked(exec.exec).mockResolvedValue(0);

      const result = await getInstallationMethod('native');

      expect(result.method).toBe(InstallationMethod.Native);
      expect(result.reason).toContain('User explicitly requested');
    });

    it('should return gem when explicitly requested', async () => {
      const result = await getInstallationMethod('gem');

      expect(result.method).toBe(InstallationMethod.Gem);
      expect(result.reason).toContain('User explicitly requested');
    });

    it('should return gem for auto in container environment', async () => {
      vi.spyOn(fs.promises, 'access')
        .mockResolvedValueOnce(undefined as never) // /.dockerenv
        .mockRejectedValue({} as never); // /etc/alpine-release
      vi.spyOn(fs.promises, 'readFile')
        .mockResolvedValueOnce('NAME="Ubuntu"\n' as never) // /etc/os-release
        .mockRejectedValue({} as never);
      vi.mocked(exec.exec).mockResolvedValue(0);

      const result = await getInstallationMethod('auto');

      expect(result.method).toBe(InstallationMethod.Gem);
      expect(result.reason).toContain('container');
    });

    it('should return native for auto on native OS', async () => {
      vi.spyOn(fs.promises, 'access').mockRejectedValue({} as never);
      vi.spyOn(fs.promises, 'readFile').mockRejectedValue({} as never);
      vi.mocked(exec.exec).mockResolvedValue(0);

      const result = await getInstallationMethod('auto');

      expect(result.method).toBe(InstallationMethod.Native);
      expect(result.reason).toContain('native OS');
    });
  });
});
