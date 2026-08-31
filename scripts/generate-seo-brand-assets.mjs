/**
 * Brand assets for Google favicon + Open Graph.
 * Run: node scripts/generate-seo-brand-assets.mjs
 *
 * Small icons use a readable "HOC" mark (logo is too detailed below ~48px).
 * OG / large icons keep the full Hub of craftss lockup.
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const sharp = require("next/node_modules/sharp");

const logo = path.join(root, "public/images/hub-of-craftss-logo.png");
const bg = { r: 12, g: 12, b: 18, alpha: 1 };

function hocMarkSvg(size) {
  const fontSize = Math.round(size * 0.34);
  const radius = Math.round(size * 0.22);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="45%" stop-color="#db2777"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <text x="${size / 2}" y="${size * 0.62}" text-anchor="middle"
    font-family="Arial Black, Arial, Helvetica, sans-serif"
    font-size="${fontSize}" font-weight="800" fill="#ffffff">HOC</text>
</svg>`);
}

async function makeLogoSquare(size, outRel) {
  const out = path.join(root, outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const pad = Math.round(size * 0.08);
  const inner = size - pad * 2;
  const resized = await sharp(logo)
    .resize(inner, inner, { fit: "contain", background: bg })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toFile(out);
  console.log("wrote", outRel);
}

async function makeHocMark(size, outRel) {
  const out = path.join(root, outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(hocMarkSvg(size)).png().toFile(out);
  console.log("wrote", outRel);
}

function createIco(images) {
  const count = images.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];
  const payloads = [];
  for (const img of images) {
    const dim = img.size >= 256 ? 0 : img.size;
    entries.push({ w: dim, h: dim, size: img.buf.length, offset });
    payloads.push(img.buf);
    offset += img.buf.length;
  }
  const out = Buffer.alloc(offset);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);
  let entryOffset = 6;
  for (const e of entries) {
    out.writeUInt8(e.w, entryOffset);
    out.writeUInt8(e.h, entryOffset + 1);
    out.writeUInt8(0, entryOffset + 2);
    out.writeUInt8(0, entryOffset + 3);
    out.writeUInt16LE(1, entryOffset + 4);
    out.writeUInt16LE(32, entryOffset + 6);
    out.writeUInt32LE(e.size, entryOffset + 8);
    out.writeUInt32LE(e.offset, entryOffset + 12);
    entryOffset += 16;
  }
  let dataOffset = headerSize;
  for (const p of payloads) {
    p.copy(out, dataOffset);
    dataOffset += p.length;
  }
  return out;
}

const meta = await sharp(logo).metadata();
console.log("logo", meta.width, meta.height);

// Readable marks for Google favicon / browser tabs
await makeHocMark(16, "public/images/hoc-icon-16.png");
await makeHocMark(32, "public/images/hoc-icon-32.png");
await makeHocMark(48, "public/images/hoc-icon-48.png");
await makeHocMark(180, "src/app/apple-icon.png");
await makeHocMark(32, "src/app/icon.png");
await makeHocMark(192, "public/images/hoc-icon-192.png");

// Full lockup for PWA / rich results where size allows
await makeLogoSquare(512, "public/images/hoc-icon-512.png");

const icoImages = [];
for (const size of [16, 32, 48]) {
  icoImages.push({
    size,
    buf: await sharp(hocMarkSvg(size)).png().toBuffer(),
  });
}
fs.writeFileSync(path.join(root, "src/app/favicon.ico"), createIco(icoImages));
console.log("wrote src/app/favicon.ico");

const ogW = 1200;
const ogH = 630;
const ogLogo = await sharp(logo)
  .resize(760, 460, { fit: "contain", background: bg })
  .png()
  .toBuffer();
await sharp({
  create: { width: ogW, height: ogH, channels: 4, background: bg },
})
  .composite([{ input: ogLogo, gravity: "centre" }])
  .png()
  .toFile(path.join(root, "src/app/opengraph-image.png"));
console.log("wrote src/app/opengraph-image.png");

await sharp(path.join(root, "src/app/opengraph-image.png"))
  .jpeg({ quality: 90 })
  .toFile(path.join(root, "public/images/hoc-og-share.jpg"));
console.log("wrote public/images/hoc-og-share.jpg");

fs.copyFileSync(
  path.join(root, "src/app/opengraph-image.png"),
  path.join(root, "src/app/twitter-image.png"),
);
console.log("wrote src/app/twitter-image.png");
