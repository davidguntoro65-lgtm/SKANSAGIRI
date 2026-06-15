// Generates PWA PNG icons from the school's SVG favicon using sharp.
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const outDir = join(root, "public", "icons");

mkdirSync(outDir, { recursive: true });

// SVG for normal icon — centered logo on dark background
const normalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="80" fill="#0f172a"/>
  <rect x="8" y="8" width="496" height="496" rx="72" stroke="#f59e0b" stroke-width="12" fill="none"/>
  <polygon points="256,48 448,160 448,352 256,464 64,352 64,160" fill="#f59e0b" opacity="0.12"/>
  <polygon points="256,48 448,160 448,352 256,464 64,352 64,160" stroke="#f59e0b" stroke-width="10" fill="none"/>
  <text x="256" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="96" font-weight="700" fill="#f59e0b" letter-spacing="6">SMK</text>
  <text x="256" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="60" font-weight="600" fill="#ffffff" letter-spacing="14">NEGERI 1</text>
  <text x="256" y="390" text-anchor="middle" font-family="Georgia, serif" font-size="38" font-weight="400" fill="#94a3b8" letter-spacing="8">WONOGIRI</text>
</svg>`;

// SVG for maskable icon — full bleed background, more padding for safe zone
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#0f172a"/>
  <polygon points="256,80 400,160 400,352 256,432 112,352 112,160" fill="#f59e0b" opacity="0.12"/>
  <polygon points="256,80 400,160 400,352 256,432 112,352 112,160" stroke="#f59e0b" stroke-width="8" fill="none"/>
  <text x="256" y="255" text-anchor="middle" font-family="Georgia, serif" font-size="88" font-weight="700" fill="#f59e0b" letter-spacing="6">SMK</text>
  <text x="256" y="330" text-anchor="middle" font-family="Georgia, serif" font-size="52" font-weight="600" fill="#ffffff" letter-spacing="12">NEGERI 1</text>
  <text x="256" y="390" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="400" fill="#94a3b8" letter-spacing="6">WONOGIRI</text>
</svg>`;

const sizes = [192, 512];

await Promise.all([
  ...sizes.map((size) =>
    sharp(Buffer.from(normalSvg))
      .resize(size, size)
      .png()
      .toFile(join(outDir, `icon-${size}.png`))
      .then(() => console.log(`✓ icon-${size}.png`))
  ),
  ...sizes.map((size) =>
    sharp(Buffer.from(maskableSvg))
      .resize(size, size)
      .png()
      .toFile(join(outDir, `icon-maskable-${size}.png`))
      .then(() => console.log(`✓ icon-maskable-${size}.png`))
  ),
]);

console.log("\nAll PWA icons generated in public/icons/");
