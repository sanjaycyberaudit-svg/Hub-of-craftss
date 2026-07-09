import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const input = process.argv[2] ?? path.join(root, "public/images/ssr-brand-banner-source.png");
const output = path.join(root, "public/images/ssr-brand-banner.png");

function isBackgroundPixel(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;

  // Near-black / dark velvet scene
  if (lum < 28) return true;
  if (lum < 52 && sat < 0.42) return true;
  // Dark blue-grey velvet (common in generated mockups)
  if (lum < 58 && b >= r && b >= g && sat < 0.55) return true;

  return false;
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (isBackgroundPixel(r, g, b)) {
    data[i + 3] = 0;
  }
}

const trimmed = await sharp(data, { raw: { width, height, channels: 4 } })
  .trim({ threshold: 10 })
  .png({ compressionLevel: 9 })
  .toFile(output);

const meta = await sharp(output).metadata();
console.log(
  `Saved ${output} (${meta.width}x${meta.height}) from ${width}x${height}`,
);
