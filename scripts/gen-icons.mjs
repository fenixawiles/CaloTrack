// One-off icon rasteriser. Run with: node scripts/gen-icons.mjs
// Requires `sharp` to be installed. Produces the PNGs referenced by the PWA manifest.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const icons = join(pub, 'icons');

const standard = readFileSync(join(pub, 'favicon.svg'));
const maskable = readFileSync(join(icons, 'icon-maskable.svg'));

const jobs = [
  { src: standard, size: 192, out: 'icon-192.png' },
  { src: standard, size: 512, out: 'icon-512.png' },
  { src: standard, size: 180, out: 'apple-touch-icon.png' },
  { src: maskable, size: 512, out: 'icon-512-maskable.png' }
];

for (const j of jobs) {
  await sharp(j.src, { density: 384 })
    .resize(j.size, j.size)
    .png()
    .toFile(join(icons, j.out));
  console.log('wrote', j.out);
}
console.log('done');
