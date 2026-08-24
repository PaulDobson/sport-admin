#!/usr/bin/env node
// One-off generator for PWA/app icons from an inline SVG source. Re-run after brand changes.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

const BACKGROUND = '#101318';
const PRIMARY = '#14e18c';

function fullBleedSvg(size) {
  const radius = Math.round(size * 0.1875);
  const ringRadius = Math.round(size * 0.3125);
  const strokeWidth = Math.round(size * 0.0547);
  const fontSize = Math.round(size * 0.4297);
  const center = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${BACKGROUND}"/>
    <circle cx="${center}" cy="${center}" r="${ringRadius}" fill="none" stroke="${PRIMARY}" stroke-width="${strokeWidth}"/>
    <text x="${center}" y="${center + fontSize * 0.34}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="${PRIMARY}" text-anchor="middle">S</text>
  </svg>`;
}

function maskableSvg(size) {
  // Keep visual content within the ~80% safe zone so OS masks don't clip it.
  const safeSize = size * 0.7;
  const ringRadius = Math.round(safeSize * 0.34);
  const strokeWidth = Math.round(safeSize * 0.06);
  const fontSize = Math.round(safeSize * 0.46);
  const center = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${BACKGROUND}"/>
    <circle cx="${center}" cy="${center}" r="${ringRadius}" fill="none" stroke="${PRIMARY}" stroke-width="${strokeWidth}"/>
    <text x="${center}" y="${center + fontSize * 0.34}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="${PRIMARY}" text-anchor="middle">S</text>
  </svg>`;
}

async function renderPng(svg, outPath) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`Wrote ${outPath}`);
}

async function main() {
  const iconsDir = join(rootDir, 'public', 'icons');
  mkdirSync(iconsDir, { recursive: true });

  await renderPng(fullBleedSvg(192), join(iconsDir, 'icon-192.png'));
  await renderPng(fullBleedSvg(512), join(iconsDir, 'icon-512.png'));
  await renderPng(maskableSvg(512), join(iconsDir, 'icon-512-maskable.png'));
  await renderPng(fullBleedSvg(512), join(rootDir, 'src', 'app', 'icon.png'));
  await renderPng(fullBleedSvg(180), join(rootDir, 'src', 'app', 'apple-icon.png'));
}

main();
