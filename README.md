# actions-mn/setup

![test](https://github.com/actions-mn/setup/workflows/test/badge.svg)

This action sets up a metanorma environment for use in actions by:

- optionally installing a version of metanorma and adding to PATH. The action will fail if no matching versions are found.

# Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- uses: actions/checkout@master
- uses: actions-mn/setup@v2
```

With specific version:
```yaml
jobs:
  build:
    runs-on: matrix.os
    strategy:
      matrix:
        os: [ windows-latest, macos-latest, ubuntu-latest ]
    name: Compule on ${{ matrix.os }}
    steps:
      - uses: actions/checkout@master
      - uses: actions-mn/setup@v1
      - name: Compile document
        run: metanorma document.adoc
```

# Maintainer notes

1. yes, node_modules need to be commited(
2. during development node_modules may be modified but devDependencies should not be commited, be careful

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
