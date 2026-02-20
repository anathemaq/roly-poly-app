import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const imageUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/----------------------------090218--background-----2X5ABpUCjDRD3y9QMemyDeDrOVVdSD.png';
const outDir = '/vercel/share/v0-project/public/icons';

const sizes = [
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
];

async function main() {
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`Downloaded image: ${buffer.length} bytes`);

  try { fs.mkdirSync(outDir, { recursive: true }); } catch {}

  for (const { name, size } of sizes) {
    const outPath = path.join(outDir, name);
    await sharp(buffer)
      .resize(size, size, { fit: 'cover', background: { r: 9, g: 2, b: 24, alpha: 1 } })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`Generated ${name}: ${stat.size} bytes`);
  }

  // Also generate ICO-like favicon (just a 32x32 png renamed)
  const favicon32 = path.join(outDir, 'favicon-32x32.png');
  const faviconDest = '/vercel/share/v0-project/public/favicon.ico';
  fs.copyFileSync(favicon32, faviconDest);
  console.log('Copied favicon.ico');

  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
