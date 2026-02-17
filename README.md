# Setup Metanorma

[![Build and Test](https://github.com/actions-mn/setup/actions/workflows/test.yml/badge.svg)](https://github.com/actions-mn/setup/actions/workflows/test.yml)
[![Integration Tests](https://github.com/actions-mn/setup/actions/workflows/integration-compile.yml/badge.svg)](https://github.com/actions-mn/setup/actions/workflows/integration-compile.yml)
[![Site Generation Tests](https://github.com/actions-mn/setup/actions/workflows/integration-site.yml/badge.svg)](https://github.com/actions-mn/setup/actions/workflows/integration-site.yml)

This action sets up the Metanorma toolchain and adds the command-line tools to the PATH. Metanorma is a suite of tools for authoring standards documents, supporting ISO, IEC, IEEE, IETF, ITU, and other standards organizations.

## What's new

- **Extra flavors support**: Install additional metanorma flavor gems (both public and private) in a single step - consolidates functionality from the separate `setup-flavors` action
- **Private flavor support**: Built-in GitHub Packages authentication for private flavors (bsi, nist, plateau) via `github-packages-token` input
- **Idempotent installation**: Automatically skips redundant installations when Metanorma is already installed with the same configuration - saves time in workflows that may call the action multiple times
- **YAML-based version registry**: Fetches version data directly from [metanorma/versions](https://github.com/metanorma/versions) repository YAML files - no Ruby/Bundler dependencies
- **Pre-built Gemfile.lock integration**: Automatically uses pre-tested Gemfile.lock files from [metanorma/versions](https://github.com/metanorma/versions) for deterministic, tested dependency resolution
- **Dependency updates while keeping metanorma-cli pinned**: New `bundle-update` input allows updating dependencies while preserving the metanorma-cli version
- **Revision-based Snap installation**: Install specific Metanorma versions on Linux using Snap revision pinning
- **Platform-specific version management**: Each platform (Chocolatey, Homebrew, Snap, Gem) tracks available versions separately
- **Fontist formula updates**: Optional automatic fontist formula updates after gem installation
- **Multi-method installation**: Support for native package managers, gem-based installation, or auto-detection

## Usage

<!-- start usage -->
```yaml
- uses: actions-mn/setup@v1
  with:
    # Version of metanorma to install
    # For native installations: empty (default) installs latest, or specify version like "1.14.4"
    # For gem installations: empty respects Gemfile.lock, "latest" runs bundle update, or specific version
    version: '' # optional, default is ''

    # Snapcraft channel (Linux only): stable, candidate, beta, edge
    # Only used when installation-method is 'native' on Linux
    snap-channel: 'stable' # optional, default is 'stable'

    # Allow pre-release versions for Chocolatey packages (Windows only)
    choco-prerelease: '' # optional

    # Installation method: 'auto' (default), 'native', 'gem'
    # auto: Auto-detect based on environment
    # native: Force native package manager (brew/snap/choco)
    # gem: Install via bundle (requires Ruby setup first)
    installation-method: 'auto' # optional, default is 'auto'

    # Path to custom Gemfile for gem-based installation
    gemfile: '' # optional

    # Bundler version for gem-based installation
    bundler-version: '2.6.5' # optional, default is '2.6.5'

    # Update fontist formulas after gem installation
    # Only applies to gem-based installations
    fontist-update: 'true' # optional, default is 'true'

    # Update dependencies while keeping metanorma-cli version pinned
    # Only applies to gem-based installations
    # When true, runs 'bundle update --except metanorma-cli'
    bundle-update: 'false' # optional, default is 'false'

    # Use pre-tested Gemfile.lock files from metanorma/versions repository
    # When true and a specific version is requested, uses pre-built lock files
    # When false, respects existing Gemfile.lock in workspace
    use-prebuilt-locks: 'true' # optional, default is 'true'

    # Space-separated list of extra flavor gems to install
    # Public flavors: iso, ietf, ribose, cc, plateau, etc. (from RubyGems)
    # Private flavors: bsi, nist (require github-packages-token)
    extra-flavors: '' # optional, default is ''

    # GitHub token to access private packages at rubygems.pkg.github.com/metanorma
    # Required for private flavors: bsi, nist
    github-packages-token: '' # optional, default is ''
```
<!-- end usage -->

## Outputs

| Output | Description |
|--------|-------------|
| `version` | The installed Metanorma version |
| `platform` | The platform Metanorma was installed on |
| `installation-method` | The installation method used |
| `idempotent` | Whether the action detected an existing installation (`true`) or performed a new installation (`false`) |

## Installation Methods

### Auto Detection (Default)

The action automatically detects the appropriate installation method based on the platform:

- **Windows**: Uses Chocolatey
- **macOS**: Uses Homebrew
- **Linux**: Uses Snap
- **Docker**: Uses gem-based installation

```yaml
- uses: actions-mn/setup@v1
```

### Native Package Installation

Forces installation using the platform's native package manager:

```yaml
- uses: actions-mn/setup@v1
  with:
    installation-method: 'native'
    version: '1.14.4'
```

#### Native Package Version Availability

Different platforms have different version availability. See the [Platform Version Matrix](#platform-version-matrix) for details.

**Windows (Chocolatey)**
- Latest: `1.14.4`
- Version data fetched from: `metanorma/versions` repository (`data/chocolatey/versions.yaml`)

**macOS (Homebrew)**
- Latest: `1.13.0`
- Version data fetched from: `metanorma/versions` repository (`data/homebrew/versions.yaml`)

**Linux (Snap)**
- Latest: `1.14.4`
- Uses revision pinning for version-specific installation
- Revision data fetched from: `metanorma/versions` repository (`data/snap/versions.yaml`)

**Docker Containers (for gem-based installation)**
- Gemfile availability tracked in: `metanorma/versions` repository (`data/gemfile/versions.yaml`)

### Gem-Based Installation

Install Metanorma as a Ruby gem using Bundler. Requires Ruby to be set up first.

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.4'
    bundler-cache: true

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
```

## Scenarios

### Install Latest Metanorma

Install the latest version available on your platform:

```yaml
- uses: actions-mn/setup@v1
```

### Install Specific Version (Native)

Install a specific Metanorma version using the native package manager:

```yaml
- uses: actions-mn/setup@v1
  with:
    version: '1.14.4'
```

> **Note**: Version availability varies by platform. See [Platform Version Matrix](#platform-version-matrix).

### Install Specific Version (Gem)

Install a specific Metanorma version using gem:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.4'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    version: '1.14.0'
```

### Respect Existing Gemfile

When using gem-based installation with an existing Gemfile, the action respects the version specified in Gemfile.lock:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.4'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
```

The action will:
- Detect if a Gemfile exists in your workspace
- Respect the versions specified in Gemfile.lock
- Not modify your Gemfile if it exists

### Use Pre-Built Gemfile.lock

When you specify a version, the action automatically uses pre-tested Gemfile.lock files from the [metanorma/versions](https://github.com/metanorma/versions) repository for deterministic, tested dependency resolution:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.4'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    version: '1.14.3'
```

This provides:
- **Deterministic installations**: All dependencies are pinned to tested versions
- **Faster installation**: No need to run `bundle install` with dependency resolution
- **Tested compatibility**: Each Gemfile.lock is pre-tested with the corresponding metanorma-cli version

**Gemfile.lock Replacement Warning**: If your workspace has an existing Gemfile.lock with a different metanorma-cli version, the action will replace it with the pre-built lock file and display a prominent warning:

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠️  GEMFILE.LOCK REPLACED WITH PRE-BUILT VERSION                 │
├──────────────────────────────────────────────────────────────────┤
│ Your Gemfile.lock has been replaced with a pre-tested lock file  │
│ from metanorma/versions repository.                              │
│                                                                  │
│ To disable this behavior, use use-prebuilt-locks: false          │
└──────────────────────────────────────────────────────────────────┘
```

### Disable Pre-Built Locks

To disable automatic Gemfile.lock replacement and respect your workspace's Gemfile.lock:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.4'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    version: '1.14.3'
    use-prebuilt-locks: 'false'
```

### Update Dependencies (Keep metanorma-cli Pinned)

To update all gem dependencies while keeping the metanorma-cli version pinned:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.4'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    version: '1.14.3'
    bundle-update: 'true'
```

This runs `bundle update --except metanorma-cli`, which:
- Updates all gems except metanorma-cli to their latest compatible versions
- Preserves the specified metanorma-cli version (1.14.3 in this example)
- Ensures you get security updates and bug fixes from dependencies

### Update to Latest Gem Version

To update Metanorma to the latest gem version:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.4'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    version: 'latest'
```

This runs `bundle update metanorma-cli` to get the latest version.

### Use Custom Gemfile

Specify a custom Gemfile path:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.4'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    gemfile: 'tools/Gemfile'
```

### Disable Fontist Formula Updates

By default, gem-based installation runs `bundle exec fontist update` to download the latest font formulas. To disable:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.4'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    fontist-update: 'false'
```

### Install from Snap Channel (Linux)

Install Metanorma from a specific Snap channel:

```yaml
- uses: actions-mn/setup@v1
  with:
    installation-method: 'native'
    snap-channel: 'edge' # options: stable, candidate, beta, edge
```

### Install Snap Revision for Specific Version

On Linux, you can install a specific Snap revision corresponding to a Metanorma version:

```yaml
- uses: actions-mn/setup@v1
  with:
    installation-method: 'native'
    version: '1.13.9'
```

The action will:
1. Detect the runner's architecture (amd64 or arm64)
2. Look up the Snap revision for version 1.13.9 and the detected architecture from `platform-snap-native-versions.json`
3. Install using `snap install metanorma --revision=<N> --classic`
4. Hold the revision to prevent automatic updates

This ensures you get exactly the Metanorma version you requested, with the ability to pin that specific Snap revision.

**Architecture Support**: Snap revision pinning supports both amd64 and arm64 architectures. The revision data includes architecture-specific revision numbers, and the action automatically selects the correct revision based on the runner's architecture.

### Install Pre-release Chocolatey Package (Windows)

To install pre-release versions from Chocolatey:

```yaml
- uses: actions-mn/setup@v1
  with:
    installation-method: 'native'
    choco-prerelease: 'true'
```

## Installing Extra Flavors

The action can install additional metanorma flavor gems beyond the default CLI installation. This replaces the separate `actions-mn/setup-flavors` action.

### Public Flavors

Public flavors are available on RubyGems and don't require authentication:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.2'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    extra-flavors: 'iso ietf ribose'
```

### Private Flavors

Private flavors (bsi, nist) are hosted on GitHub Packages and require authentication:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.2'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    extra-flavors: 'bsi nist'
    github-packages-token: ${{ secrets.METANORMA_CI_PAT_TOKEN }}
```

### Private Flavors List

| Flavor | Description | Requires Token |
|--------|-------------|----------------|
| `bsi` | British Standards Institution | Yes |
| `nist` | National Institute of Standards and Technology | Yes |
| `iso` | International Organization for Standardization | No |
| `ietf` | Internet Engineering Task Force | No |
| `ribose` | Ribose flavor | No |
| `cc` | CalConnect (formerly csd) | No |
| `plateau` | Plateau flavor | No |

### Mixed Public and Private Flavors

You can install both public and private flavors together:

```yaml
- uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.2'

- uses: actions-mn/setup@v1
  with:
    installation-method: 'gem'
    extra-flavors: 'iso bsi ribose'
    github-packages-token: ${{ secrets.METANORMA_CI_PAT_TOKEN }}
```

### BSI Fontist Setup

When installing the BSI flavor, the action automatically configures fontist private formulas for proprietary fonts. This requires the `github-packages-token` to access the private fontist formulas repository.

### Migration from setup-flavors

If you were previously using the separate `setup-flavors` action:

**Before:**
```yaml
- uses: actions-mn/setup@v3
- uses: actions-mn/setup-flavors@v1
  with:
    extra-flavors: bsi
    github-packages-token: ${{ secrets.METANORMA_CI_PAT_TOKEN }}
```

**After:**
```yaml
- uses: actions-mn/setup@v3
  with:
    installation-method: gem
    extra-flavors: bsi
    github-packages-token: ${{ secrets.METANORMA_CI_PAT_TOKEN }}
```

## Idempotent Installation

The action automatically detects when Metanorma is already installed with the same configuration and skips redundant installation steps. This is useful in workflows where the action may be called multiple times.

### How It Works

When the action runs, it:

1. Checks if a previous installation state file exists (`.metanorma-setup-state.json`)
2. Compares the current configuration (version, platform, installation method) with the saved state
3. If the configuration matches and Metanorma is available in PATH, skips the installation
4. If the configuration has changed or Metanorma is not available, performs a fresh installation

### Checking Idempotency Status

The `idempotent` output indicates whether installation was skipped:

```yaml
- uses: actions-mn/setup@v1
  id: setup-metanorma

- name: Check if installation was skipped
  run: |
    if [ "${{ steps.setup-metanorma.outputs.idempotent }}" == "true" ]; then
      echo "Metanorma was already installed, skipped redundant installation"
    else
      echo "Metanorma was freshly installed"
    fi
```

### Configuration Change Detection

The action reinstalls Metanorma if any of these configuration values change:

- `version`
- `installation-method`
- `snap-channel` (Linux)
- `choco-prerelease` (Windows)
- `platform` (detected automatically)

### Use in Docker Container

For gem-based installation in Docker:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: ruby:alpine
    steps:
    - uses: actions/checkout@v4

    - uses: actions-mn/setup@v1
      with:
        installation-method: 'gem'

    - run: bundle exec metanorma --version
```

For Alpine-based containers with native Ruby:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: ruby:alpine
    steps:
    - uses: actions/checkout@v4

    # Alpine's musl libc is incompatible with ruby/setup-ruby
    # Use gem installation directly
    - uses: actions-mn/setup@v1
      with:
        installation-method: 'gem'

    - run: bundle exec metanorma --version
```

## Integration Tests

The action includes comprehensive integration tests that verify both native and gem-based installation methods across all platforms (Ubuntu, macOS, Windows). These tests:

1. **Single Document Compilation**: Compiles a sample Metanorma document to verify the installation works correctly
2. **Site Generation**: Runs `metanorma site generate` on a sample repository to test full workflow functionality

The integration tests use the [mn-samples-cc](https://github.com/metanorma/mn-samples-cc) repository for testing, which provides a small, fast-compiling sample document set.

**Test Matrix:**

| Platform | Native Method | Gem Method |
|----------|---------------|------------|
| Ubuntu (Snap) | ✅ Tested | ✅ Tested |
| macOS (Homebrew) | ✅ Tested | ✅ Tested |
| Windows (Chocolatey) | ✅ Tested | ✅ Tested |

## Platform Version Matrix

| Version | Windows (Chocolatey) | macOS (Homebrew) | Linux (Snap) | Gem (RubyGems) |
|---------|---------------------|------------------|--------------|----------------|
| 1.14.4 | ✅ | ❌ | ✅ (rev 288) | ✅ |
| 1.14.3 | ✅ | ❌ | ✅ (rev 287) | ✅ |
| 1.13.9 | ✅ | ❌ | ✅ (rev 276) | ✅ |
| 1.13.8 | ✅ | ❌ | ✅ (rev 268) | ✅ |
| 1.13.7 | ✅ | ❌ | ✅ (rev 263) | ✅ |
| 1.13.6 | ✅ | ❌ | ✅ (rev 256) | ✅ |
| 1.13.4 | ✅ | ❌ | ✅ (rev 244) | ✅ |
| 1.13.2 | ✅ | ❌ | ✅ (rev 232) | ✅ |
| 1.13.0 | ❌ | ✅ | ✅ (rev ~220) | ✅ |
| 1.11.5 | ✅ | ❌ | ✅ (rev 210) | ✅ |
| 1.11.4 | ✅ | ❌ | ✅ (rev 204) | ✅ |
| 1.11.3 | ✅ | ❌ | ✅ (rev 198) | ✅ |
| 1.11.0 | ✅ | ❌ | ✅ (rev 190) | ✅ |

**Legend:**
- ✅ Available
- ❌ Not available
- Snap revision numbers shown are for amd64 (arm64 revisions also tracked)

### Version Data

The action fetches version data from the [metanorma/versions](https://github.com/metanorma/versions) repository using YAML files:

- **Snap**: `data/snap/versions.yaml` - Revision mapping for version-specific installation
- **Gemfile**: `data/gemfile/versions.yaml` - Available gem versions with Gemfile availability
- **Homebrew**: `data/homebrew/versions.yaml` - Tap versions with tag/commit information
- **Chocolatey**: `data/chocolatey/versions.yaml` - Package versions with pre-release flags

**Version fetching is done via HTTPS** using pure TypeScript/Node.js - no Ruby, Bundler, or git clone required. The YAML files are fetched directly from GitHub's raw content URLs and parsed using the `js-yaml` library.

**Fallback behavior**: If version data cannot be fetched (e.g., network issues), the action gracefully falls back to existing behavior for native installations.

## Snap Revision Pinning

Snap packages don't support version-specific channels like `1.14.3/stable`. Instead, each upload to the Snap Store gets a unique revision number. To install a specific Metanorma version via Snap:

1. The action fetches version data from the `metanorma/versions` repository (`data/snap/versions.yaml`)
2. Finds the corresponding Snap revision for that version and architecture
3. Installs using `snap install metanorma --revision=<N> --classic`
4. Holds the revision with `snap refresh metanorma --hold`

**Example:**

```yaml
- uses: actions-mn/setup@v1
  with:
    version: '1.13.9'
```

This installs Snap revision 276 (which corresponds to Metanorma 1.13.9 on amd64) or revision 277 (for arm64) and holds it at that revision.

**Revision Data Format:**

The YAML file contains version entries with architecture-specific revision data:

```yaml
versions:
  - version: "1.13.9"
    revision: 276
    channel: stable
    arch: amd64
    published_at: "2024-01-15T10:30:00Z"
  - version: "1.13.9"
    revision: 277
    channel: stable
    arch: arm64
    published_at: "2024-01-15T10:30:00Z"
```

## Maintainer notes

1. Yes, `node_modules` needs to be committed
2. During development `node_modules` may be modified but `devDependencies` should not be committed, be careful

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
