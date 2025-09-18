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
      version: '1.13.0'
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
          version: '1.13.1'
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
      ruby-version: '3.3'
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
- **Exact version**: `'1.13.1'`
- **Semantic range**: `'^1.13.0'` (compatible with 1.13.x)
- **Minimum version**: `'>=1.13.0'`

## Platform-Specific Notes

### Windows
- Uses Chocolatey package manager
- Supports prerelease versions via `choco-prerelease` input

### macOS
- Uses Homebrew package manager
- Downloads specific formula versions when version is specified

### Linux
- Uses Snap package manager
- Supports different channels (stable, edge, beta, candidate)
- Installs with `--classic` confinement for specific versions

# Maintainer notes

1. yes, `node_modules` need to be committed
2. during development `node_modules` may be modified but `devDependencies` should not be committed, be careful.

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
