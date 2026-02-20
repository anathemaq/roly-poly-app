import sharp from 'sharp';

const sizes = [192, 512];
const imageUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/----------------------------090218--background-----2X5ABpUCjDRD3y9QMemyDeDrOVVdSD.png';

const response = await fetch(imageUrl);
const buffer = Buffer.from(await response.arrayBuffer());

for (const size of sizes) {
  const resized = await sharp(buffer)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer();
  console.log(`ICON_${size}:${resized.toString('base64')}`);
}

