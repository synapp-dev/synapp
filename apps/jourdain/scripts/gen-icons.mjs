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

const sourceOpaque = fs.readFileSync("public/icon-orb.png");
const sourceTransparent = fs.readFileSync("public/icon-orb-transparent.png");
const out = "public/icons";
fs.mkdirSync(out, { recursive: true });

// [name, size, pad, source] — the favicon uses the transparent orb so it sits
// cleanly on any browser-tab colour; the PWA + Apple icons use the opaque orb
// (iOS/Android fill transparent areas with black anyway). pad insets the orb,
// but the margin is baked into the source stills so all jobs are full-bleed.
const jobs = [
  ["favicon-32.png", 32, 0, sourceTransparent],
  ["icon-192.png", 192, 0, sourceOpaque],
  ["icon-512.png", 512, 0, sourceOpaque],
  ["apple-touch-icon.png", 180, 0, sourceOpaque],
];

for (const [name, size, pad, src] of jobs) {
  const border = Math.round(size * pad);
  let image;
  if (border > 0) {
    // Fill the inset with the source's dominant colour for a seamless border.
    const { dominant } = await sharp(src).stats();
    image = sharp(src)
      .resize(size - border * 2, size - border * 2)
      .extend({
        top: border,
        bottom: border,
        left: border,
        right: border,
        background: dominant,
      });
  } else {
    image = sharp(src).resize(size, size);
  }
  await image.png().toFile(path.join(out, name));
  console.log("wrote", name, size, border ? `(pad ${border}px)` : "");
}
