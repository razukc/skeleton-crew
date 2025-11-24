#!/usr/bin/env node

/**
 * Creates placeholder PNG icon files for the extension
 * These are minimal valid PNG files that can be replaced with proper icons later
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Minimal 1x1 PNG in base64 (purple color #764ba2)
// This is a valid PNG file that browsers will accept
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN0YPj/HwADgQF/e8l1PAAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(pngBase64, 'base64');

const sizes = [16, 48, 128];

console.log('Creating placeholder icon files...\n');

sizes.forEach(size => {
  const filename = `icon${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  // Write the placeholder PNG
  fs.writeFileSync(filepath, pngBuffer);
  console.log(`✓ Created ${filename}`);
});

console.log('\n✓ Placeholder icons created successfully!');
console.log('\nNote: These are minimal placeholder icons.');
console.log('For production, replace with proper icons using:');
console.log('  - The icon.svg file in public/ directory');
console.log('  - Image editing software (GIMP, Photoshop, Figma)');
console.log('  - Online converters (cloudconvert.com, svgtopng.com)');
