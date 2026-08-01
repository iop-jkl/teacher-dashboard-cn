import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const svgPath = resolve('public/pwa-icon.svg');
const svgBuffer = readFileSync(svgPath);

await sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(resolve('public/pwa-icon-192.png'));

await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(resolve('public/pwa-icon-512.png'));

console.log('PWA icons generated');
