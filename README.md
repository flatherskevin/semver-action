# Overview

GitHub Action to bump semantic versioning based on releases or tags

## Usage

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: version
        id: version
        uses: flatherskevin/semver-action@v1
        with:
          incrementLevel: patch
          source: tags
      - name: Release
        uses: softprops/action-gh-release@v1
        with:
          name: ${{ steps.version.outputs.nextVersion }}
          tag_name: ${{ steps.version.outputs.nextVersion }}
```

`incrementLevel` can be dynamically modified by commit messages:
- `patch` 
  - if `[patch]` appears anywhere in the head commit message
  - if the head commit message starts with `fix`
- `minor` 
  - if `[minor]` appears anywhere in the head commit message
  - if the head commit message starts with `feat`
- `major` 
  - if `[major]` appears anywhere in the head commit message
  - if the head commit message starts with `feat!`