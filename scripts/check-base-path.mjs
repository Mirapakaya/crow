#!/usr/bin/env node
/**
 * Verify that a static export under a base path contains no root-absolute
 * asset paths. Fails if any `href="/..."` or `src="/..."` is found in the
 * generated HTML that would break under a subdirectory deploy.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, extname, join } from 'path'

const ROOT = process.cwd()
const DIST = resolve(ROOT, 'dist')

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (extname(entry.name) === '.html') out.push(full)
  }
  return out
}

const files = walk(DIST)
let bad = 0
for (const file of files) {
  const content = readFileSync(file, 'utf8')
  const matches = content.match(/(?:src|href)="\/[^"]*"/g)
  if (matches) {
    for (const match of matches) {
      // Allow root-absolute paths that are intentional (e.g. manifest start_url)
      if (match.includes('start_url') || match.includes('manifest')) continue
      console.error(`BAD: ${file}: ${match}`)
      bad++
    }
  }
}

if (bad > 0) {
  console.error(`\nFound ${bad} root-absolute asset path(s)`)
  process.exit(1)
}

console.log('No root-absolute asset paths found.')
