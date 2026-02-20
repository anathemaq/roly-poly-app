import fs from 'fs';
import path from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const srcDir = path.resolve('public/icons');

for (const size of sizes) {
  const filename = `icon-${size}x${size}.png`;
  const srcPath = path.join(srcDir, filename);
  const data = fs.readFileSync(srcPath);
  console.log(`${filename}: ${data.length} bytes`);
  // Output as base64 so we can verify
  if (size === 192) {
    console.log(`BASE64_192:${data.toString('base64').substring(0, 100)}...`);
  }
}
console.log('All files exist!');
