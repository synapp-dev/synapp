// One-off: rasterize public/icon-orb.png (a still from the Jourdain orb video)
// into the PWA + favicon PNGs. Run from the jourdain app dir:
//   node scripts/gen-icons.mjs
// To refresh the source still from the video:
//   ffmpeg -ss 0.5 -i public/videos/jourdain-orb.mov -frames:v 1 \
//     -vf "crop=2160:2160,scale=1024:1024" public/icon-orb.png -y
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

const source = fs.readFileSync("public/icon-orb.png");
const out = "public/icons";
fs.mkdirSync(out, { recursive: true });

const jobs = [
  ["favicon-32.png", 32],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of jobs) {
  // The orb still is already on a solid (opaque) black background, so no
  // flatten is needed.
  await sharp(source).resize(size, size).png().toFile(path.join(out, name));
  console.log("wrote", name, size);
}
