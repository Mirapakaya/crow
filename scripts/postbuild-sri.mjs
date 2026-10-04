#!/usr/bin/env node
/**
 * Post-build: compute the Subresource Integrity hash for theme.js and inject
 * it into every HTML file in dist/.
 *
 * Crow's CSP is strict, so the theme bootstrap script must be either hashed
 * or external. It is already external (public/theme.js); this script adds the
 * matching integrity attribute so a compromised server cannot substitute it.
 */
import { createHash } from 'crypto'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { resolve, join, extname } from 'path'

const ROOT = resolve(process.cwd())
const DIST = join(ROOT, 'dist')
const THEME = join(DIST, 'theme.js')

try {
  statSync(THEME)
} catch {
  console.warn('theme.js not found in dist/; skipping SRI injection')
  process.exit(0)
}

const hash = createHash('sha256')
  .update(readFileSync(THEME))
  .digest('base64')
const integrity = `sha256-${hash}`

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full)
    } else if (extname(entry.name) === '.html') {
      const original = readFileSync(full, 'utf8')
      // Match any script that loads theme.js (with or without base path)
      const updated = original.replace(
        /(<script[^>]*src="[^"]*theme\.js"[^>]*)>/g,
        `$1 integrity="${integrity}" crossorigin="anonymous">`,
      )
      if (updated !== original) {
        writeFileSync(full, updated)
        console.log(`Injected SRI into ${full}`)
      }
    }
  }
}

walk(DIST)
console.log(`theme.js SRI: ${integrity}`)
