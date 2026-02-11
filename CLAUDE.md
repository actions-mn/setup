# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Action that sets up the Metanorma toolchain across different platforms (Windows, macOS, Linux). It's a TypeScript-based action using Node.js 20 runtime.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript (`tsc`) and bundles with `ncc build`
- **Format**: `npm run format` - Runs Prettier on all TypeScript files
- **Format check**: `npm run format-check` - Checks formatting without modifying files
- **Test**: `npm test` - Runs Jest tests (uses `jest-circus` as test runner)

To run a single test file: `npm test -- __tests__/setup-metanorma.test.ts`

## Code Architecture

The action has a simple structure:

- **`src/setup-metanorma.ts`**: Entry point that reads GitHub Action inputs (`version`, `snap-channel`, `choco-prerelase`) and calls the installer
- **`src/installer.ts`**: Core platform-specific installation logic

### Installation Logic (`installer.ts`)

The installer detects the platform and installs Metanorma using the appropriate package manager:

- **macOS**: Uses Homebrew (`brew install`)
  - With version: Downloads the specific Formula from `homebrew-metanorma` repo and installs via `--formula` flag
  - Without version: Installs from `metanorma/metanorma/metanorma` tap
- **Linux**: Uses Snap (`sudo snap install`)
  - With version: Uses `--channel=${version}/${snap_channel}` with `--classic` flag
  - Without version: Basic install
- **Windows**: Uses Chocolatey (`choco install`)
  - Special workaround: Installs `python3` version 3.9.13 first (known issue with 3.10-3.11)
  - Handles git.install exit code 1 failure via `ignoreFailure` pattern
  - With `choco_prerelase=true`: Adds `--pre` flag and appends `-pre` suffix to version

### Important Quirks

1. **node_modules are committed**: This repository intentionally commits `node_modules` (see README.md "Maintainer notes"). During development, only modify `dependencies` - never commit `devDependencies`. A Husky post-commit hook automatically prunes devDependencies and commits the corrected `node_modules`.

2. **Husky hooks**: Pre-commit runs `npm run build && npm run format`. Post-commit runs `npm prune --production` and commits the corrected `node_modules`.

3. **Strict TypeScript**: `tsconfig.json` has `"strict": true` enabled

4. **Test mocking**: Tests use `jest.mock()` for `@actions/exec`, `@actions/core`, and `node-fetch`. Platform-specific behavior is tested via the `IS_WINDOWS`, `IS_MACOSX`, `IS_LINUX` constants.

5. **Action inputs**: Defined in `action.yml` - the action uses `node20` runtime and main entry is `dist/index.js` (the ncc-bundled output)
