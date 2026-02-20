import sharp from 'sharp';
import path from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputPath = path.resolve('public/icons/logo-512.png');
const outputDir = path.resolve('public/icons');

for (const size of sizes) {
  const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
  await sharp(inputPath)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(outputPath);
  console.log(`Generated ${size}x${size}`);
}

console.log('All icons generated!');
