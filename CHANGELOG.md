# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive GitHub Actions best practices implementation
- Security workflows with CodeQL analysis and dependency scanning
- Automated dependency updates via Dependabot
- Improved error handling and logging
- Action outputs for version and cache status
- Cross-platform testing matrix
- Detailed documentation with usage examples

### Changed
- Updated action to use Node.js 20 runtime
- Improved input validation and parameter handling
- Enhanced README with comprehensive usage examples
- Modernized workflow configurations
- Fixed parameter type consistency across codebase

### Fixed
- Corrected typo in workflow name ("Compule" → "Compile")
- Fixed Husky configuration to prevent problematic post-commit hooks
- Improved build script with proper ncc configuration
- Enhanced error handling in installer functions

### Security
- Added CodeQL security analysis
- Implemented dependency review for pull requests
- Added security audit workflow
- Configured Dependabot for automated security updates

## [1.0.0] - Initial Release

### Added
- Initial implementation of Metanorma setup action
- Support for Windows, macOS, and Linux platforms
- Version specification support
- Basic testing infrastructure
- Cross-platform installation via package managers:
  - Windows: Chocolatey
  - macOS: Homebrew
  - Linux: Snap

### Features
- Automatic detection of platform and appropriate package manager
- Support for specific version installation
- Prerelease version support for Windows
- Snap channel configuration for Linux
