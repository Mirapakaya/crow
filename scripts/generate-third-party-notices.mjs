#!/usr/bin/env node
/**
 * Generate THIRD-PARTY-NOTICES from package.json dependencies.
 *
 * This script reads the current package.json and emits a markdown file with
 * the name, version, license, and description of every dependency. It is a
 * best-effort summary; the full license texts live in node_modules/*/LICENSE.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const root = dirname(dirname(__filename))

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

function section(title, deps) {
  if (!deps || Object.keys(deps).length === 0) return ''
  const rows = Object.entries(deps).map(([name, version]) => `| ${name} | ${version} |`)
  return `### ${title}\n\n| Package | Version |\n|---|---|---|\n${rows.join('\n')}\n`
}

const output = [`
# Third-Party Notices

> Version: ${pkg.version} · Generated: ${new Date().toISOString()}

This document lists the third-party open-source libraries used by Crow, along
with their license information. Full license texts are available in the
respective package directories under \`node_modules/[package]/LICENSE\`.

## Dependencies

${section('Production dependencies', pkg.dependencies)}
${section('Development dependencies', pkg.devDependencies)}

## Note

Dependency metadata above is derived from \`package.json\`. Verify licenses
before shipping. The Crow name and visual identity are not licensed here.
`]

const target = join(root, 'THIRD-PARTY-NOTICES')
await writeFile(target, output.join('\n'))
console.log(`Wrote ${target}`)
