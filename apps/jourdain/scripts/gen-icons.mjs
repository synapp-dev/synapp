// One-off: rasterize public/icon.svg into PWA PNG icons.
// Run from the jourdain app dir: node scripts/gen-icons.mjs
/* global process */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// sharp is hoisted into the pnpm store, not a direct dep — resolve it there.
const sharpPath = path.resolve(
  process.cwd(),
  "../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp"
);
const sharp = require(sharpPath);

const svg = fs.readFileSync("public/icon.svg");
const out = "public/icons";
fs.mkdirSync(out, { recursive: true });

const jobs = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["apple-touch-icon.png", 180, true], // opaque background for iOS home screen
];

for (const [name, size, opaque] of jobs) {
  let img = sharp(svg).resize(size, size);
  if (opaque) img = img.flatten({ background: "#050410" });
  await img.png().toFile(path.join(out, name));
  console.log("wrote", name, size);
}
