// Fetch HLTV Top-20-of-2025 player photos from Liquipedia (gzip + descriptive UA
// per liquipedia.net/api-terms-of-use), resolve the infobox image, download it,
// and emit a manifest. Rate-limited to respect the 1-req/2s parse limit.
//
//   node scripts/fetch-pro-photos.mjs
//
// Output: scripts/.pro-photos/<alias>.jpg + scripts/.pro-photos/manifest.json
import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UA = "intradark-seed/1.0 (agirton@intradark.com)";
const API = "https://liquipedia.net/counterstrike/api.php";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), ".pro-photos");

// alias as it appears on the card; `page` overrides the Liquipedia title when it
// differs from a simple first-letter-capitalised alias.
const PLAYERS = [
  { rank: 1, alias: "ZywOo" },
  { rank: 2, alias: "donk" },
  { rank: 3, alias: "ropz" },
  { rank: 4, alias: "m0NESY", page: "M0NESY" },
  { rank: 5, alias: "sh1ro" },
  { rank: 6, alias: "molodoy" },
  { rank: 7, alias: "flameZ", page: "FlameZ" },
  { rank: 8, alias: "frozen" },
  { rank: 9, alias: "KSCERATO" },
  { rank: 10, alias: "Spinx" },
  { rank: 11, alias: "Twistzz" },
  { rank: 12, alias: "mezii" },
  { rank: 13, alias: "Senzu" },
  { rank: 14, alias: "XANTARES" },
  { rank: 15, alias: "YEKINDAR" },
  { rank: 16, alias: "xertioN", page: "XertioN" },
  { rank: 17, alias: "torzsi" },
  { rank: 18, alias: "NiKo" },
  { rank: 19, alias: "iM", page: "ImClutch" },
  { rank: 20, alias: "b1t" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Encoding": "gzip" },
  });
  if (!res.ok) throw new Error(`API ${res.status} for ${params.titles ?? params.page}`);
  return res.json();
}

async function infoboxImageFile(page) {
  const d = await api({ action: "parse", page, prop: "wikitext", section: "0" });
  const text = d?.parse?.wikitext?.["*"];
  if (!text) throw new Error(`no wikitext for ${page}`);
  // |image=Foo.jpg  (first wins; ignore imagesize etc.)
  const m = text.match(/\|\s*image\s*=\s*([^|\n}]+\.(?:jpg|jpeg|png|gif))/i);
  if (!m) throw new Error(`no infobox image for ${page}`);
  return m[1].trim();
}

async function fileUrl(fileTitle) {
  const d = await api({
    action: "query",
    titles: `File:${fileTitle}`,
    prop: "imageinfo",
    iiprop: "url",
  });
  const pages = d?.query?.pages ?? {};
  const first = Object.values(pages)[0];
  const url = first?.imageinfo?.[0]?.url;
  if (!url) throw new Error(`no imageinfo url for File:${fileTitle}`);
  return url;
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download ${res.status} for ${url}`);
  await pipeline(res.body, createWriteStream(dest));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const manifest = [];
  for (const p of PLAYERS) {
    const page = p.page ?? p.alias;
    try {
      const fileTitle = await infoboxImageFile(page);
      await sleep(2200);
      const url = await fileUrl(fileTitle);
      const ext = path.extname(new URL(url).pathname) || ".jpg";
      const dest = path.join(OUT, `${p.alias.toLowerCase()}${ext}`);
      await download(url, dest);
      manifest.push({ ...p, page, sourceUrl: url, file: path.basename(dest), ok: true });
      console.log(`✓ #${p.rank} ${p.alias} → ${path.basename(dest)}`);
    } catch (e) {
      manifest.push({ ...p, page, ok: false, error: String(e.message ?? e) });
      console.log(`✗ #${p.rank} ${p.alias}: ${e.message ?? e}`);
    }
    await sleep(2200);
  }
  await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  const ok = manifest.filter((m) => m.ok).length;
  console.log(`\n${ok}/${PLAYERS.length} photos fetched. Manifest: ${path.join(OUT, "manifest.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
