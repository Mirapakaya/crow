/**
 * Generate PWA icon PNGs from the Crow SVG source.
 *
 * Run: node scripts/generate-icons.mjs
 *
 * Requires: npm install -D sharp
 *
 * Generates icons at 72, 96, 128, 144, 152, 192, 384, 512 px
 * Plus maskable variants (80% safe area) at 192 and 512 px.
 */

import { readFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SVG_PATH = resolve(ROOT, 'public/crow.svg')
const ICONS_DIR = resolve(ROOT, 'public/icons')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const MASKABLE_SIZES = [192, 512]

async function main() {
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true })
  }

  const svgBuffer = readFileSync(SVG_PATH)

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
        background: { r: 9, g: 9, b: 11, alpha: 1 }, // #09090b
      },
    })
      .composite([{ input: innerPng, left: padding, top: padding }])
      .png()
      .toFile(outPath)
    console.log(`✓ ${outPath} (${size}x${size}, maskable)`)
  }

  console.log('\nAll icons generated.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
