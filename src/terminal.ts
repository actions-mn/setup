import {
  warning as coreWarning,
  error as coreError,
  info as coreInfo,
  debug as coreDebug
} from '@actions/core';

/**
 * ANSI color codes for terminal output
 */
export enum AnsiColor {
  Reset = '\x1b[0m',
  Bright = '\x1b[1m',
  Dim = '\x1b[2m',
  Underscore = '\x1b[4m',
  Blink = '\x1b[5m',
  Reverse = '\x1b[7m',
  Hidden = '\x1b[8m',

  FgBlack = '\x1b[30m',
  FgRed = '\x1b[31m',
  FgGreen = '\x1b[32m',
  FgYellow = '\x1b[33m',
  FgBlue = '\x1b[34m',
  FgMagenta = '\x1b[35m',
  FgCyan = '\x1b[36m',
  FgWhite = '\x1b[37m',

  BgBlack = '\x1b[40m',
  BgRed = '\x1b[41m',
  BgGreen = '\x1b[42m',
  BgYellow = '\x1b[43m',
  BgBlue = '\x1b[44m',
  BgMagenta = '\x1b[45m',
  BgCyan = '\x1b[46m',
  BgWhite = '\x1b[47m'
}

/**
 * Terminal class for colored and formatted output
 * Automatically detects color support and gracefully degrades to plain text
 */
export class Terminal {
  private supportsColor: boolean;

  constructor() {
    this.supportsColor = this.detectColorSupport();
  }

  /**
   * Detect if the terminal supports color output
   */
  private detectColorSupport(): boolean {
    // GitHub Actions always supports color
    if (process.env.GITHUB_ACTIONS === 'true') {
      return true;
    }

    // Check CI environment variables
    if (process.env.CI === 'true') {
      return true;
    }

    // Check for COLORTERM variable
    if (process.env.COLORTERM && process.env.COLORTERM !== '') {
      return true;
    }

    // Check TERM variable (but exclude 'dumb' which doesn't support color)
    const term = process.env.TERM;
    if (term && term !== 'dumb' && term !== '') {
      return true;
    }

    // Default to false for unknown environments
    return false;
  }

  /**
   * Apply color to text if color is supported
   */
  colorize(text: string, color: AnsiColor): string {
    if (!this.supportsColor) {
      return text;
    }
    return `${color}${text}${AnsiColor.Reset}`;
  }

  /**
   * Print a warning message with yellow color
   */
  warning(message: string): void {
    const icon = '⚠️ ';
    const coloredMessage = this.colorize(
      `${icon}WARNING: ${message}`,
      AnsiColor.FgYellow
    );
    coreWarning(coloredMessage);
    this.echo(coloredMessage);
  }

  /**
   * Print an error message with red color
   */
  error(message: string): void {
    const icon = '❌ ';
    const coloredMessage = this.colorize(
      `${icon}ERROR: ${message}`,
      AnsiColor.FgRed
    );
    coreError(coloredMessage);
    this.echo(coloredMessage);
  }

  /**
   * Print a success message with green color
   */
  success(message: string): void {
    const icon = '✅ ';
    const coloredMessage = this.colorize(
      `${icon}${message}`,
      AnsiColor.FgGreen
    );
    coreInfo(coloredMessage);
    this.echo(coloredMessage);
  }

  /**
   * Print an info message with blue color
   */
  info(message: string): void {
    const icon = 'ℹ️ ';
    const coloredMessage = this.colorize(`${icon}${message}`, AnsiColor.FgBlue);
    coreInfo(coloredMessage);
    this.echo(coloredMessage);
  }

  /**
   * Print a debug message with dim color
   */
  debug(message: string): void {
    const coloredMessage = this.colorize(message, AnsiColor.Dim);
    coreDebug(coloredMessage);
  }

  /**
   * Write directly to stdout for immediate visibility
   */
  private echo(message: string): void {
    process.stdout.write(message + '\n');
  }

  /**
   * Display a prominent warning box for Gemfile.lock replacement
   */
  warnGemfileLockReplacement(originalLock: string, prebuiltLock: string): void {
    const lines = [
      '',
      this.colorize(
        '┌──────────────────────────────────────────────────────────────────┐',
        AnsiColor.FgYellow
      ),
      this.colorize(
        '│ ⚠️  GEMFILE.LOCK REPLACED WITH PRE-BUILT VERSION                 │',
        AnsiColor.FgYellow
      ),
      this.colorize(
        '├──────────────────────────────────────────────────────────────────┤',
        AnsiColor.FgYellow
      ),
      this.colorize(
        '│ Your Gemfile.lock has been replaced with a pre-tested lock file  │',
        AnsiColor.FgYellow
      ),
      this.colorize(
        '│ from metanorma/versions repository.                              │',
        AnsiColor.FgYellow
      ),
      this.colorize(
        '│                                                                  │',
        AnsiColor.FgYellow
      ),
      this.colorize(
        `│ Original: ${this.padRight(originalLock, 57)}│`,
        AnsiColor.FgYellow
      ),
      this.colorize(
        `│ Pre-built: ${this.padRight(prebuiltLock, 57)}│`,
        AnsiColor.FgYellow
      ),
      this.colorize(
        '│                                                                  │',
        AnsiColor.FgYellow
      ),
      this.colorize(
        '│ This ensures deterministic, tested dependency resolution.        │',
        AnsiColor.FgYellow
      ),
      this.colorize(
        '│                                                                  │',
        AnsiColor.FgYellow
      ),
      this.colorize(
        '│ To disable this behavior, use:                                   │',
        AnsiColor.FgYellow
      ),
      this.colorize(
        '│   use-prebuilt-locks: false                                      │',
        AnsiColor.FgCyan
      ),
      this.colorize(
        '└──────────────────────────────────────────────────────────────────┘',
        AnsiColor.FgYellow
      ),
      ''
    ];

    lines.forEach(line => this.echo(line));
  }

  /**
   * Pad a string to a specific length by truncating with ellipsis if needed
   */
  private padRight(str: string, length: number): string {
    if (str.length > length) {
      return str.substring(0, length - 3) + '...';
    }
    return str.padEnd(length);
  }

  /**
   * Display an info box about pre-built lock file usage
   */
  infoPrebuiltLockUsed(version: string): void {
    const lines = [
      '',
      this.colorize(
        '┌──────────────────────────────────────────────────────────────────┐',
        AnsiColor.FgGreen
      ),
      this.colorize(
        `│ ✅ USING PRE-BUILT GEMFILE.LOCK FOR VERSION ${this.padRight(version, 34)}│`,
        AnsiColor.FgGreen
      ),
      this.colorize(
        '├──────────────────────────────────────────────────────────────────┤',
        AnsiColor.FgGreen
      ),
      this.colorize(
        '│ Using pre-tested Gemfile.lock from metanorma/versions            │',
        AnsiColor.FgGreen
      ),
      this.colorize(
        '│ repository for deterministic, tested dependency resolution.      │',
        AnsiColor.FgGreen
      ),
      this.colorize(
        '└──────────────────────────────────────────────────────────────────┘',
        AnsiColor.FgGreen
      ),
      ''
    ];

    lines.forEach(line => this.echo(line));
  }
}
