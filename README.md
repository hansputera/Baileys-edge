# Baileys-edge
An automation to compile baileys project, and upload it into npmjs

## Usage
To use this workflow/automation, you could use `hansputera/Baileys-edge@master` action in your workflow jobs.

**Example:**
```yml
name: Baileys Edge Workflow
on:
  schedule:
    - cron: '0 0 * * *'
  push:
    branches:
      - 'master'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    name: Update baileys
    steps:
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Run baileys edge
        uses: hansputera/Baileys-edge@master
        with:
          cloneDir: baileys
          checkFile: baileys_check.json
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Explanation:**
1. This workflow need `NPM_TOKEN` on secrets to push the package to NPM Registry
2. You can change the `cloneDir` to anything empty directory you want.
3. You can change the `checkFile`, this file includes latest commit date, baileys version, and the npm package version.
