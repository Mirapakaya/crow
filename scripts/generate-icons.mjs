#!/usr/bin/env node
// Generate simple placeholder PNG icons for Crow PWA.
// Creates solid dark rounded-square icons with a minimalist crow silhouette.
// Uses only Node built-ins — no canvas, sharp, or external deps.
// For production, replace these with properly designed icons.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ── Minimal PNG encoder ──────────────────────────────────────────────
// Creates an uncompressed (store-only) PNG with zlib-compressed IDAT.
// This avoids any native dependencies.

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zlibDeflate(raw) {
  // Minimal zlib wrapper: 2-byte header + stored blocks + 4-byte checksum
  // For small images, stored (uncompressed) blocks are fine.
  const maxBlock = 65535;
  const blocks = [];
  let offset = 0;
  while (offset < raw.length) {
    const remaining = raw.length - offset;
    const len = Math.min(remaining, maxBlock);
    const bfinal = offset + len >= raw.length ? 1 : 0;
    const block = new Uint8Array(5 + len);
    block[0] = bfinal; // BFINAL=1, BTYPE=00 (stored)
    block[1] = len & 0xff;
    block[2] = (len >> 8) & 0xff;
    block[3] = ~len & 0xff;
    block[4] = (~len >> 8) & 0xff;
    block.set(raw.subarray(offset, offset + len), 5);
    blocks.push(block);
    offset += len;
  }
  // Adler32
  let a = 1, b2 = 0;
  for (let i = 0; i < raw.length; i++) {
    a = (a + raw[i]) % 65521;
    b2 = (b2 + a) % 65521;
  }
  const adler = ((b2 << 16) | a) >>> 0;

  const data = blocks;
  // zlib header: CM=8, CINFO=7, FCHECK
  const header = new Uint8Array([0x78, 0x01]);
  const checksum = new Uint8Array(4);
  checksum[0] = (adler >> 24) & 0xff;
  checksum[1] = (adler >> 16) & 0xff;
  checksum[2] = (adler >> 8) & 0xff;
  checksum[3] = adler & 0xff;

  const totalLen = 2 + data.reduce((s, d) => s + d.length, 0) + 4;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  result.set(header, pos); pos += 2;
  for (const d of data) { result.set(d, pos); pos += d.length; }
  result.set(checksum, pos);
  return result;
}

function makePNG(size) {
  // RGBA image
  const pixels = new Uint8Array(size * size * 4);
  const bgR = 0x11, bgG = 0x11, bgB = 0x14; // #111114
  const fgR = 0xa1, fgG = 0xa1, fgB = 0xaa; // #a1a1aa
  const darkR = 0x11, darkG = 0x11, darkB = 0x14; // eye/mouth

  const cornerRadius = Math.floor(size * 96 / 512); // ~96 on 512

  // Draw rounded square background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (isInsideRoundedRect(x, y, size, size, cornerRadius)) {
        pixels[idx] = bgR;
        pixels[idx + 1] = bgG;
        pixels[idx + 2] = bgB;
        pixels[idx + 3] = 255;
      } else {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0; // transparent
      }
    }
  }

  // Draw simplified crow silhouette (chat bubble shape)
  const scale = size / 512;
  // Chat bubble body
  fillEllipse(pixels, size, 256 * scale, 244 * scale, 144 * scale, 124 * scale, fgR, fgG, fgB);
  // Tail of the bubble
  const tx = 196 * scale, ty = 293 * scale;
  fillTriangle(pixels, size,
    tx, ty,
    180 * scale, 372 * scale,
    238 * scale, 295 * scale,
    fgR, fgG, fgB
  );
  // Eyes
  fillCircle(pixels, size, 220 * scale, 248 * scale, 12 * scale, darkR, darkG, darkB);
  fillCircle(pixels, size, 292 * scale, 248 * scale, 12 * scale, darkR, darkG, darkB);
  // Beak/smile
  drawArc(pixels, size, 256 * scale, 276 * scale, 24 * scale, darkR, darkG, darkB);

  // Build raw image data with filter byte (0 = None) per row
  const rawData = new Uint8Array(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    rawData[y * (1 + size * 4)] = 0; // filter: None
    rawData.set(
      pixels.subarray(y * size * 4, (y + 1) * size * 4),
      y * (1 + size * 4) + 1
    );
  }

  const compressed = zlibDeflate(rawData);

  // Build PNG chunks
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = new Uint8Array(13);
  ihdrData[0] = (size >> 24) & 0xff; ihdrData[1] = (size >> 16) & 0xff;
  ihdrData[2] = (size >> 8) & 0xff;  ihdrData[3] = size & 0xff;
  ihdrData[4] = (size >> 24) & 0xff; ihdrData[5] = (size >> 16) & 0xff;
  ihdrData[6] = (size >> 8) & 0xff;  ihdrData[7] = size & 0xff;
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT
  const idat = makeChunk('IDAT', compressed);

  // IEND
  const iend = makeChunk('IEND', new Uint8Array(0));

  const png = new Uint8Array(signature.length + ihdr.length + idat.length + iend.length);
  let pos = 0;
  png.set(signature, pos); pos += signature.length;
  png.set(ihdr, pos); pos += ihdr.length;
  png.set(idat, pos); pos += idat.length;
  png.set(iend, pos);

  return Buffer.from(png);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = new Uint8Array(4 + 4 + len + 4);
  chunk[0] = (len >> 24) & 0xff;
  chunk[1] = (len >> 16) & 0xff;
  chunk[2] = (len >> 8) & 0xff;
  chunk[3] = len & 0xff;
  // type
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  // CRC over type + data
  const crcInput = new Uint8Array(4 + len);
  for (let i = 0; i < 4; i++) crcInput[i] = type.charCodeAt(i);
  crcInput.set(data, 4);
  const crcVal = crc32(crcInput);
  chunk[8 + len] = (crcVal >> 24) & 0xff;
  chunk[9 + len] = (crcVal >> 16) & 0xff;
  chunk[10 + len] = (crcVal >> 8) & 0xff;
  chunk[11 + len] = crcVal & 0xff;
  return chunk;
}

function isInsideRoundedRect(x, y, w, h, r) {
  if (x < r && y < r) return dist2(x, y, r, r) <= r * r;
  if (x >= w - r && y < r) return dist2(x, y, w - r, r) <= r * r;
  if (x < r && y >= h - r) return dist2(x, y, r, h - r) <= r * r;
  if (x >= w - r && y >= h - r) return dist2(x, y, w - r, h - r) <= r * r;
  return x >= 0 && x < w && y >= 0 && y < h;
}

function dist2(x1, y1, x2, y2) {
  const dx = x1 - x2, dy = y1 - y2;
  return dx * dx + dy * dy;
}

function setPixel(pixels, size, x, y, r, g, b) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || ix >= size || iy < 0 || iy >= size) return;
  const idx = (iy * size + ix) * 4;
  pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b; pixels[idx + 3] = 255;
}

function fillCircle(pixels, size, cx, cy, radius, r, g, b) {
  const ri = Math.ceil(radius);
  for (let dy = -ri; dy <= ri; dy++) {
    for (let dx = -ri; dx <= ri; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(pixels, size, cx + dx, cy + dy, r, g, b);
      }
    }
  }
}

function fillEllipse(pixels, size, cx, cy, rx, ry, r, g, b) {
  const rxi = Math.ceil(rx), ryi = Math.ceil(ry);
  for (let dy = -ryi; dy <= ryi; dy++) {
    for (let dx = -rxi; dx <= rxi; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        setPixel(pixels, size, cx + dx, cy + dy, r, g, b);
      }
    }
  }
}

function fillTriangle(pixels, size, x0, y0, x1, y1, x2, y2, r, g, b) {
  const minX = Math.floor(Math.min(x0, x1, x2));
  const maxX = Math.ceil(Math.max(x0, x1, x2));
  const minY = Math.floor(Math.min(y0, y1, y2));
  const maxY = Math.ceil(Math.max(y0, y1, y2));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInTriangle(x, y, x0, y0, x1, y1, x2, y2)) {
        setPixel(pixels, size, x, y, r, g, b);
      }
    }
  }
}

function pointInTriangle(px, py, x0, y0, x1, y1, x2, y2) {
  const d1 = sign(px, py, x0, y0, x1, y1);
  const d2 = sign(px, py, x1, y1, x2, y2);
  const d3 = sign(px, py, x2, y2, x0, y0);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function sign(px, py, x1, y1, x2, y2) {
  return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}

function drawArc(pixels, size, cx, cy, radius, r, g, b) {
  // Draw a simple smile arc (bottom half of ellipse)
  for (let angle = Math.PI * 0.15; angle <= Math.PI * 0.85; angle += 0.02) {
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * 0.6 * Math.sin(angle);
    setPixel(pixels, size, x, y, r, g, b);
    setPixel(pixels, size, x + 1, y, r, g, b);
    setPixel(pixels, size, x, y + 1, r, g, b);
  }
}

// ── Main ──────────────────────────────────────────────────────────────

for (const sz of [192, 512]) {
  const png = makePNG(sz);
  const path = join(outDir, `icon-${sz}.png`);
  writeFileSync(path, png);
  console.log(`✓ Created ${path} (${png.length} bytes, ${sz}×${sz})`);
}

console.log('\nDone. Replace these with production-quality icons before launch.');
