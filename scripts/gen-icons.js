import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const imageUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/----------------------------090218--background-----2X5ABpUCjDRD3y9QMemyDeDrOVVdSD.png';
const sizes = [180, 192, 512];

const response = await fetch(imageUrl);
const buffer = Buffer.from(await response.arrayBuffer());
console.log(`Downloaded source image: ${buffer.length} bytes`);

const outDir = 'generated-icons';
fs.mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  const outPath = path.join(outDir, `icon-${size}x${size}.png`);
  await sharp(buffer)
    .resize(size, size, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile(outPath);
  
  // Output base64 so we can reconstruct the file
  const data = fs.readFileSync(outPath);
  console.log(`ICON_${size}_BASE64_START`);
  console.log(data.toString('base64'));
  console.log(`ICON_${size}_BASE64_END`);
  console.log(`Generated icon-${size}x${size}.png (${data.length} bytes)`);
}

console.log('Done!');
