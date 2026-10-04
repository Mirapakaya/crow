#!/usr/bin/env node
/**
 * Validate that every host file produced by gen-headers.mjs exists and
 * contains the required security headers.
 */
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()

const required = [
  { name: 'X-Content-Type-Options', value: 'nosniff' },
  { name: 'Referrer-Policy', value: 'no-referrer' },
  { name: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { name: 'Content-Security-Policy' },
]

const files = [
  { path: 'public/_headers', label: 'Cloudflare/Netlify _headers' },
  { path: 'vercel.json', label: 'Vercel vercel.json' },
  { path: 'render.yaml', label: 'Render render.yaml' },
  { path: 'fly.toml', label: 'Fly.io fly.toml' },
  { path: 'railway.json', label: 'Railway railway.json' },
]

let failed = false

for (const { path, label } of files) {
  const full = resolve(ROOT, path)
  if (!existsSync(full)) {
    console.error(`MISSING: ${label} (${path})`)
    failed = true
    continue
  }

  const content = readFileSync(full, 'utf8')

  // Docker-based hosts delegate headers to nginx.conf inside the image.
  if (path === 'fly.toml' || path === 'railway.json') {
    if (content.includes('nginx.conf') || content.includes('Dockerfile')) {
      console.log(`OK: ${label} (delegates headers to nginx.conf)`)
    } else {
      console.error(`FAIL: ${label} (${path}) should reference nginx.conf/Dockerfile`)
      failed = true
    }
    continue
  }

  const missing = required.filter((h) => {
    const nameOk = content.includes(h.name)
    const valueOk = h.value ? content.includes(h.value) : true
    return !(nameOk && valueOk)
  })
  if (missing.length > 0) {
    console.error(`FAIL: ${label} (${path}) missing:`, missing.map((m) => m.name))
    failed = true
  } else {
    console.log(`OK: ${label}`)
  }
}

if (failed) {
  console.error('\ncheck-headers failed')
  process.exit(1)
}

console.log('\ncheck-headers passed')
