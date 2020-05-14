# actions-mn/setup

![Main workflow](https://github.com/actions-mn/setup/workflows/Main%20workflow/badge.svg)

This action sets up a metanorma environment for use in actions by:

- optionally installing a version of metanorma and adding to PATH. The action will fail if no matching versions are found.

# Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- uses: actions/checkout@master
- uses: actions-mn/setup@v1
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

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
