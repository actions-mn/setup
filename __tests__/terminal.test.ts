import {describe, it, expect, beforeEach, vi} from 'vitest';
import {Terminal, AnsiColor} from '../src/terminal';
import * as core from '@actions/core';

vi.mock('@actions/core');

describe('Terminal', () => {
  let terminal: Terminal;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up GitHub Actions environment to ensure color support
    process.env.GITHUB_ACTIONS = 'true';
    terminal = new Terminal();
  });

  describe('colorize', () => {
    it('should apply color to text', () => {
      const result = terminal.colorize('test message', AnsiColor.FgGreen);

      expect(result).toBe(`${AnsiColor.FgGreen}test message${AnsiColor.Reset}`);
    });

    it('should apply multiple styles', () => {
      const result = terminal.colorize('bold', AnsiColor.Bright);

      expect(result).toBe(`${AnsiColor.Bright}bold${AnsiColor.Reset}`);
    });

    it('should apply red color', () => {
      const result = terminal.colorize('error', AnsiColor.FgRed);

      expect(result).toBe(`${AnsiColor.FgRed}error${AnsiColor.Reset}`);
    });

    it('should apply yellow color', () => {
      const result = terminal.colorize('warning', AnsiColor.FgYellow);

      expect(result).toBe(`${AnsiColor.FgYellow}warning${AnsiColor.Reset}`);
    });

    it('should apply cyan color', () => {
      const result = terminal.colorize('info', AnsiColor.FgCyan);

      expect(result).toBe(`${AnsiColor.FgCyan}info${AnsiColor.Reset}`);
    });

    it('should combine with background color', () => {
      const result = terminal.colorize('text', AnsiColor.BgRed);

      expect(result).toBe(`${AnsiColor.BgRed}text${AnsiColor.Reset}`);
    });
  });

  describe('warning', () => {
    it('should output warning with icon and color', () => {
      const consoleSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      terminal.warning('This is a warning');

      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: This is a warning')
      );

      const calls = consoleSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('should escape special characters in message', () => {
      const consoleSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      terminal.warning('Warning with special chars: %s');

      expect(core.warning).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('error', () => {
    it('should output error with icon and color', () => {
      const consoleSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      terminal.error('This is an error');

      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('❌'));
      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: This is an error')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('success', () => {
    it('should output success message with icon and color', () => {
      const consoleSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      terminal.success('Operation completed');

      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('✅'));
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Operation completed')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('info', () => {
    it('should output info message with icon and color', () => {
      const consoleSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      terminal.info('Information message');

      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('ℹ️'));
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Information message')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('debug', () => {
    it('should output debug message with dim color', () => {
      terminal.debug('Debug message');

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });
  });

  describe('warnGemfileLockReplacement', () => {
    it('should display warning box for Gemfile.lock replacement', () => {
      const consoleSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      terminal.warnGemfileLockReplacement(
        '/workspace/Gemfile.lock',
        'v1.14.3/Gemfile.lock.archived (metanorma/versions)'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('GEMFILE.LOCK REPLACED')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('/workspace/Gemfile.lock')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'v1.14.3/Gemfile.lock.archived (metanorma/versions)'
        )
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('use-prebuilt-locks: false')
      );

      consoleSpy.mockRestore();
    });

    it('should display all lines of the warning box', () => {
      const consoleSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      terminal.warnGemfileLockReplacement(
        '/path/to/Gemfile.lock',
        'v1.14.3/Gemfile.lock.archived (metanorma/versions)'
      );

      // Should have multiple lines (at least 10: box top, header, content lines, box bottom)
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(10);

      consoleSpy.mockRestore();
    });
  });

  describe('infoPrebuiltLockUsed', () => {
    it('should display info box for pre-built lock usage', () => {
      const consoleSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      terminal.infoPrebuiltLockUsed('1.14.3');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('USING PRE-BUILT GEMFILE.LOCK')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1.14.3')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('metanorma/versions')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('padRight', () => {
    it('should pad short strings', () => {
      const padRight = terminal['padRight'].bind(terminal);
      const result = padRight('test', 10);

      expect(result).toBe('test      ');
      expect(result.length).toBe(10);
    });

    it('should truncate long strings with ellipsis', () => {
      const padRight = terminal['padRight'].bind(terminal);
      const result = padRight('this is a very long string', 10);

      expect(result).toBe('this is...'); // Truncated to 10 chars with ellipsis
      expect(result.length).toBe(10);
    });

    it('should return exact length string unchanged', () => {
      const padRight = terminal['padRight'].bind(terminal);
      const result = padRight('exactlen', 8);

      // String is already 8 chars, padEnd returns it unchanged
      expect(result).toBe('exactlen');
      expect(result.length).toBe(8);
    });

    it('should handle empty string', () => {
      const padRight = terminal['padRight'].bind(terminal);
      const result = padRight('', 5);

      expect(result).toBe('     ');
      expect(result.length).toBe(5);
    });

    it('should truncate string to exactly length - 3 + ellipsis', () => {
      const padRight = terminal['padRight'].bind(terminal);
      const result = padRight('abcdefghijk', 8);

      expect(result).toBe('abcde...'); // 5 chars + '...'
      expect(result.length).toBe(8);
    });
  });

  describe('AnsiColor', () => {
    it('should have all expected color codes', () => {
      expect(AnsiColor.Reset).toBe('\x1b[0m');
      expect(AnsiColor.FgRed).toBe('\x1b[31m');
      expect(AnsiColor.FgGreen).toBe('\x1b[32m');
      expect(AnsiColor.FgYellow).toBe('\x1b[33m');
      expect(AnsiColor.FgBlue).toBe('\x1b[34m');
      expect(AnsiColor.FgCyan).toBe('\x1b[36m');
    });
  });
});
