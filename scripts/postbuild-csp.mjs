#!/usr/bin/env node
/**
 * Post-build CSP hardening.
 *
 * Next.js static export injects inline scripts/styles. We hash every inline
 * block in dist/**/*.html and update the CSP in each HTML file and in the
 * host header files (public/_headers, vercel.json, etc.).
 */
import { createHash } from 'crypto'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { resolve, join, extname } from 'path'

const ROOT = resolve(process.cwd())
const DIST = join(ROOT, 'dist')

function walk(dir) {
  const out = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full))
    } else if (extname(entry.name) === '.html') {
      out.push(full)
    }
  }
  return out
}

function sha256(content) {
  return createHash('sha256').update(content).digest('base64')
}

function extractInlineScripts(html) {
  const scripts = []
  html.replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi, (_m, content, offset) => {
    const before = html.slice(0, offset)
    if (!before.includes('//')) {
      scripts.push(content)
    }
    return _m
  })
  return scripts
}

function extractInlineStyles(html) {
  const styles = []
  html.replace(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi, (_m, content) => {
    styles.push(content)
    return _m
  })
  return styles
}

const files = walk(DIST)
const scriptHashes = new Set()
const styleHashes = new Set()

for (const file of files) {
  const html = readFileSync(file, 'utf8')
  for (const script of extractInlineScripts(html)) {
    scriptHashes.add(`'sha256-${sha256(script)}'`)
  }
  for (const style of extractInlineStyles(html)) {
    styleHashes.add(`'sha256-${sha256(style)}'`)
  }
}

// Bootstrap script from Next.js static export is loaded with __NEXT_DATA__.
// We also allow the self origin for scripts and styles.
const scriptSrc = ["'self'", ...scriptHashes].join(' ')
const styleSrc = ["'self'", ...styleHashes].join(' ')
const styleSrcElem = ["'self'", ...styleHashes].join(' ')

const baseCsp = [
  "default-src 'none'",
  `script-src ${scriptSrc}`,
  `style-src ${styleSrc}`,
  `style-src-elem ${styleSrcElem}`,
  "style-src-attr 'none'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' wss:",
  "font-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types crow",
  "upgrade-insecure-requests",
].join('; ')

for (const file of files) {
  let html = readFileSync(file, 'utf8')
  html = html.replace(
    /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="[^"]*"[^>]*>/i,
    `<meta http-equiv="Content-Security-Policy" content="${baseCsp}" />`,
  )
  writeFileSync(file, html)
}

// Update host header files
function updateHeadersFile(path, csp) {
  const full = resolve(ROOT, path)
  let content = readFileSync(full, 'utf8')
  content = content.replace(/Content-Security-Policy: [^\n]*/, `Content-Security-Policy: ${csp}`)
  writeFileSync(full, content)
}

try {
  updateHeadersFile('public/_headers', baseCsp)
  // Regenerate vercel.json etc. with the new CSP
  const { execFileSync } = await import('child_process')
  execFileSync('node', ['scripts/gen-headers.mjs'], { cwd: ROOT })
} catch (err) {
  console.warn('Could not update all header files:', err.message)
}

console.log(`Hashed ${scriptHashes.size} inline scripts and ${styleHashes.size} inline styles.`)
console.log('CSP updated in dist/**/*.html and host header files.')
