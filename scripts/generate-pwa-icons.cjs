// Rasterize the existing vector brand mark using Next's installed image dependency.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
(async () => {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'public', 'icons');
  await fs.mkdir(output, { recursive: true });
  const original = await fs.readFile(path.join(root, 'src', 'app', 'icon.svg'), 'utf8');
  for (const size of [192, 512]) await sharp(Buffer.from(original)).resize(size, size).png().toFile(path.join(output, `kiblat-${size}.png`));
  const paths = original.slice(original.indexOf('<path'), original.lastIndexOf('</svg>'));
  const padded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0c2624"/><g transform="translate(6.4 6.4) scale(.8)">${paths}</g></svg>`;
  await sharp(Buffer.from(padded)).resize(512, 512).png().toFile(path.join(output, 'kiblat-maskable-512.png'));
  await sharp(Buffer.from(padded)).resize(180, 180).png().toFile(path.join(output, 'apple-touch-icon.png'));
})().catch(error => { console.error(error); process.exitCode = 1; });
