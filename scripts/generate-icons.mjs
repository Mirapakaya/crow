/**
 * Generate PWA icon PNGs from the Crow SVG source.
 *
 * Run: node scripts/generate-icons.mjs
 *
 * Requires: npm install -D sharp
 *
 * Generates icons at 72, 96, 128, 144, 152, 192, 384, 512 px
 * Plus maskable variants (80% safe area) at 192 and 512 px.
 *
 * If the SVG source is missing, falls back to a generated "C" brand mark
 * on the dark background (#0a0a0a) with the accent colour (#e5e5e5).
 */

import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SVG_PATH = resolve(ROOT, 'public/crow.svg')
const ICONS_DIR = resolve(ROOT, 'public/icons')

const BG = '#0a0a0a'
const BG_RGB = { r: 10, g: 10, b: 10, alpha: 1 }
const ACCENT = '#e5e5e5'

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const MASKABLE_SIZES = [192, 512]

/**
 * Build a simple SVG with a stylised "C" as a fallback brand mark when
 * the main crow.svg is not available (e.g. in CI without the asset).
 */
function fallbackSvg() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="96" fill="${BG}"/>
  <text x="256" y="340" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="320" fill="${ACCENT}">C</text>
</svg>`)
}

async function main() {
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true })
  }

  const hasSvg = existsSync(SVG_PATH)
  const svgBuffer = hasSvg ? readFileSync(SVG_PATH) : fallbackSvg()
  if (!hasSvg) {
    console.warn('⚠ crow.svg not found; using fallback "C" brand mark')
  }

  // Dynamic import so the script fails gracefully if sharp isn't installed
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error(
      'sharp is required. Install it with: npm install -D sharp',
    )
    process.exit(1)
  }

  // Generate standard icons
  for (const size of SIZES) {
    const outPath = resolve(ICONS_DIR, `icon-${size}.png`)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath)
    console.log(`✓ ${outPath} (${size}x${size})`)
  }

  // Generate maskable icons (80% safe area — content centered in inner 80%)
  for (const size of MASKABLE_SIZES) {
    const innerSize = Math.round(size * 0.8)
    const padding = Math.round((size - innerSize) / 2)

    // Render the icon at inner size, then composite onto padded canvas
    const innerPng = await sharp(svgBuffer)
      .resize(innerSize, innerSize)
      .png()
      .toBuffer()

    const outPath = resolve(ICONS_DIR, `icon-maskable-${size}.png`)
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BG_RGB,
      },
    })
      .composite([{ input: innerPng, left: padding, top: padding }])
      .png()
      .toFile(outPath)
    console.log(`✓ ${outPath} (${size}x${size}, maskable)`)
  }

  // Generate a 180×180 Apple Touch Icon (not in the web manifest but needed
  // by iOS when saved to home screen). Placed at the public root where iOS
  // looks for it by convention.
  const applePath = resolve(ROOT, 'public', 'apple-touch-icon.png')
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(applePath)
  console.log(`✓ ${applePath} (180×180, apple-touch-icon)`)

  console.log('\nAll icons generated.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
