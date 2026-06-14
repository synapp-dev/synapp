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

// The orb still sits on a solid background; use its dominant colour to fill any
// padding so the inset border blends seamlessly.
const { dominant } = await sharp(source).stats();

// [name, size, pad] — pad is the inset fraction per edge. The padding/margin is
// baked into the source still (public/icon-orb.png), so all icons are full-bleed
// here; bump a pad value if a specific size needs extra breathing room.
const jobs = [
  ["favicon-32.png", 32, 0],
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["apple-touch-icon.png", 180, 0],
];

for (const [name, size, pad] of jobs) {
  const border = Math.round(size * pad);
  const image =
    border > 0
      ? sharp(source)
          .resize(size - border * 2, size - border * 2)
          .extend({
            top: border,
            bottom: border,
            left: border,
            right: border,
            background: dominant,
          })
      : sharp(source).resize(size, size);
  await image.png().toFile(path.join(out, name));
  console.log("wrote", name, size, border ? `(pad ${border}px)` : "");
}
