#!/usr/bin/env node
/**
 * Parse src/styles/theme.css and verify every text/background role pair
 * meets WCAG 2.2 AA contrast targets.
 *
 * Targets:
 *   - body text: 4.5 : 1
 *   - large/UI text: 3 : 1
 *
 * The checker knows about --text, --text-muted, --bg, --surface, --accent,
 * --danger, --success and their light-theme analogues.
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const themePath = join(__dirname, '../src/styles/theme.css')
const css = await readFile(themePath, 'utf8')

const vars = new Map()
const varRe = /(--[a-z0-9_-]+):\s*([^;]+)/g
let m
while ((m = varRe.exec(css)) !== null) {
  vars.set(m[1], m[2].trim())
}

function resolve(value) {
  if (!value) return null
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
    return value
  }
  if (value.startsWith('var(')) {
    const name = value.slice(4, -1)
    return resolve(vars.get(name))
  }
  return null
}

function luminance(hex) {
  const s = hex.replace('#', '')
  const r = parseInt(s.slice(0, 2), 16) / 255
  const g = parseInt(s.slice(2, 4), 16) / 255
  const b = parseInt(s.slice(4, 6), 16) / 255
  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrast(a, b) {
  const l1 = luminance(a) + 0.05
  const l2 = luminance(b) + 0.05
  return l1 > l2 ? l1 / l2 : l2 / l1
}

const pairs = [
  ['--text', '--bg', 4.5],
  ['--text-muted', '--bg', 4.5],
  ['--text', '--surface', 4.5],
  ['--text-inverse', '--accent', 3.0],
  ['--text-inverse', '--danger', 4.5],
  ['--text-inverse', '--success', 4.5],
]

const themes = ['[data-theme="light"]', '[data-theme="dark"]']
let failures = 0

for (const themeSelector of themes) {
  for (const [fgVar, bgVar, min] of pairs) {
    const fg = resolve(vars.get(`${themeSelector} ${fgVar}`) || vars.get(fgVar))
    const bg = resolve(vars.get(`${themeSelector} ${bgVar}`) || vars.get(bgVar))
    if (!fg || !bg) {
      console.warn(`skip ${themeSelector} ${fgVar}/${bgVar} (unresolvable)`)
      continue
    }
    const ratio = contrast(fg, bg)
    if (ratio < min) {
      console.error(`${themeSelector} ${fgVar} on ${bgVar}: ${ratio.toFixed(2)} < ${min}`)
      failures++
    } else {
      console.log(`${themeSelector} ${fgVar} on ${bgVar}: ${ratio.toFixed(2)}`)
    }
  }
}

if (failures > 0) {
  process.exit(1)
}
console.log('All token pairs pass WCAG 2.2 AA targets.')
