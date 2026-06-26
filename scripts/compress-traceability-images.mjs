import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'public', 'assets', 'traceability');
const minBytes = 300_000;
const maxWidth = 1400;

const files = fs.readdirSync(dir).filter((name) => /^stage-\d+\.png$/i.test(name));

for (const name of files) {
  const filePath = path.join(dir, name);
  const before = fs.statSync(filePath).size;
  if (before < minBytes) {
    console.log(`skip ${name} (${before} bytes)`);
    continue;
  }

  const output = await sharp(filePath)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 80 })
    .toBuffer();

  if (output.length >= before) {
    console.log(`skip ${name} (no gain: ${before} -> ${output.length})`);
    continue;
  }

  fs.writeFileSync(filePath, output);
  console.log(`compressed ${name}: ${before} -> ${output.length} bytes`);
}
