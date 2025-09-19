# Setup Metanorma Action

![test](https://github.com/actions-mn/setup/workflows/test/badge.svg)

This GitHub Action sets up the Metanorma toolchain in your workflow environment, making the `metanorma` command available for document compilation across Windows, macOS, and Linux runners.

## Features

- 🚀 **Cross-platform support**: Works on Windows, macOS, and Linux
- 📦 **Version flexibility**: Install latest or specific versions
- ⚡ **Fast setup**: Optimized installation process
- 🔧 **Zero configuration**: Works out of the box with sensible defaults

## Usage

### Basic usage

Install the latest stable version of Metanorma:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions-mn/setup@main
  - name: Compile document
    run: metanorma document.adoc
```

### With specific version

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions-mn/setup@main
    with:
      version: '1.13.6'  # Use platform-specific versions: 1.13.6 (Snap/Choco), 1.13.2 (Homebrew)
  - name: Compile document
    run: metanorma document.adoc
```

### Cross-platform matrix

```yaml
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    name: Build on ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions-mn/setup@main
        with:
          version: '1.13.6'
      - name: Compile document
        run: metanorma document.adoc
```

### Advanced configuration

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions-mn/setup@main
    with:
      version: '1.13.0'
      snap-channel: 'stable'        # Linux: snapcraft channel
      choco-prerelease: 'false'     # Windows: allow prerelease versions
  - name: Compile document
    run: metanorma document.adoc
```

### With Ruby environment and Fontist

For documents requiring fonts via Fontist, the new enhanced `use-bundler` mode provides automatic environment setup:

**Simplified approach (recommended):**
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions-mn/setup@main
    with:
      use-bundler: true
  - name: Compile document with fonts
    run: bundle exec metanorma document.adoc
```

**Manual approach (for advanced use cases):**
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ruby/setup-ruby@v1
    with:
      ruby-version: '3.4'
      bundler-cache: true
  - uses: metanorma/ci/inkscape-setup-action@main
  - uses: actions-mn/setup@main
    with:
      use-bundler: true
  - name: Compile document with fonts
    run: bundle exec metanorma document.adoc
```

### Complete bundler workflow example

```yaml
name: generate

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: true

      # Single step setup with automatic environment detection
      - name: Setup Metanorma with bundler
        uses: actions-mn/setup@main
        with:
          use-bundler: true

      - name: Generate documents
        run: |
          bundle exec metanorma document.adoc
          bundle exec metanorma --version
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `version` | Version of metanorma to install. Leave empty for latest stable version. Supports semantic versioning. | No | `''` (latest) |
| `snap-channel` | Snapcraft channel for Linux installations. See [snapcraft channels](https://snapcraft.io/docs/channels) for details. | No | `'stable'` |
| `choco-prerelease` | Allow prerelease versions when installing via Chocolatey on Windows. | No | `'false'` |
| `use-bundler` | Setup Ruby environment with bundler cache, install Inkscape, and update Fontist. Automatically detects and sets up missing tools. | No | `'false'` |

## Outputs

| Output | Description |
|--------|-------------|
| `version` | The version of metanorma that was installed |
| `cache-hit` | Whether the installation was restored from cache |
| `ruby-version` | The version of Ruby that was set up (only when use-bundler is true) |

## Version Specification

You can specify versions in several ways:

- **Latest**: Leave `version` empty or use `'latest'`
- **Exact version**: `'1.13.6'` (Snap/Chocolatey) or `'1.13.2'` (Homebrew)
- **Semantic range**: `'^1.13.0'` (compatible with 1.13.x)
- **Minimum version**: `'>=1.13.0'`

**Note:** Available versions vary by package manager:
- **Snap (Linux)**: 1.13.6 latest
- **Chocolatey (Windows)**: 1.13.6 latest
- **Homebrew (macOS)**: 1.13.2 latest
- **Bundler (Gemfile)**: 1.13.6 latest

## Platform-Specific Notes

### Windows
- Uses Chocolatey package manager
- Supports prerelease versions via `choco-prerelease` input
- Supports version-specific installations

### macOS
- Uses Homebrew package manager via official tap (`metanorma/metanorma/metanorma`)
- Falls back to latest stable version when specific versions are requested (with warning)
- Reliable installation using modern Homebrew practices

### Linux
- Uses Snap package manager with `--classic` confinement
- Falls back to latest stable version when specific versions are requested (with warning)
- Uses modern snap installation approach (channel versions are deprecated)

## Development

This project uses **yarn** for package management and development workflows.

### Prerequisites

- Node.js 20 or later
- Yarn 1.22+ (classic)

### Setup

```bash
# Clone the repository
git clone https://github.com/actions-mn/setup.git
cd setup

# Install dependencies
yarn install --frozen-lockfile
```

### Development Workflow

```bash
# Format code with Prettier
yarn format

# Check code formatting
yarn format-check

# Run tests
yarn test

# Build the action
yarn build

# Run all checks (format + test + build)
yarn format && yarn test && yarn build
```

### Making Changes

1. Make your changes to TypeScript source files in `src/`
2. Update tests in `__tests__/` if needed
3. Run `yarn format` to ensure consistent formatting
4. Run `yarn test` to verify all tests pass
5. Run `yarn build` to compile the action
6. Commit all changes including the built `dist/` directory

### Testing Locally

The action can be tested locally by:
1. Using act (if available): `act -j test`
2. Creating a test workflow in a separate repository
3. Running the individual functions via the test suite

### CI/CD

The project uses GitHub Actions for continuous integration:
- **lint-and-test**: Checks formatting, runs tests, and builds
- **test**: Tests the action across platforms
- **test-version**: Tests version-specific installations
- **test-bundler-***: Tests bundler integration workflows

All workflows use yarn for consistency.

## Maintainer Notes

1. `node_modules` need to be committed for GitHub Actions
2. During development, `node_modules` may be modified but `devDependencies` should not be committed
3. Always use `yarn` commands, not `npm`, for consistency with CI
4. The `dist/` directory must be committed after running `yarn build`
5. Use `yarn format` before committing to ensure formatting compliance

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
