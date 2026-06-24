/**
 * Build & package the two CS2 plugin overlay zips for Redline's ZIP_URL.
 *
 *   deathmatch zip = Metamod + CounterStrikeSharp 1.0.367 + IntradarkDeathmatch + IntradarkDmStats
 *   pug zip        = Metamod + MatchZy 0.8.15 (with-cssharp bundle)
 *
 * Redline downloads the zip per node and overlays it onto the server's file
 * tree, so the zip's layout must mirror the server root. We stage everything
 * under a configurable root prefix (default `game/csgo`).
 *
 * Usage (from apps/intradark):
 *   node scripts/package-cs2-plugins.mjs                 # build both, no upload
 *   node scripts/package-cs2-plugins.mjs --upload        # + upload to Supabase, print URLs
 *   node scripts/package-cs2-plugins.mjs --only deathmatch
 *   node scripts/package-cs2-plugins.mjs --root game/csgo --version 2026-06-24
 *   node scripts/package-cs2-plugins.mjs --with-gameinfo # also ship a patched gameinfo.gi (see notes)
 *
 * Upload needs SUPABASE_ADMIN_KEY + NEXT_PUBLIC_SUPABASE_URL, so run via:
 *   pnpm exec dotenv -e .env.local -- node scripts/package-cs2-plugins.mjs --upload
 *
 * Requirements: .NET 8 SDK (`dotnet`) and `tar` (Win11/macOS/Linux ship bsdtar,
 * which extracts .zip + .tar.gz and creates .zip).
 */

import { spawnSync } from "node:child_process";
import { createWriteStream, readdirSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(APP_DIR, ".cache", "cs2-plugins");
const STAGE_DIR = path.join(APP_DIR, ".cache", "cs2-stage");
const DIST_DIR = path.join(APP_DIR, "dist", "cs2-plugins");
// Drop the server's current `gameinfo.gi` here; the packager patches in the
// metamod loader line and bakes it into both zips. See cs2-overlay/README.md.
const OVERLAY_DIR = path.join(APP_DIR, "scripts", "cs2-overlay");
const BUCKET = "cs2-plugins";

// ── Pinned components ──────────────────────────────────────────────────────
const CSS_VERSION = "1.0.367"; // MUST match the CounterStrikeSharp.API in the .csproj files.
const MATCHZY_VERSION = "0.8.15";
const COMPONENTS = {
  css: {
    url: `https://github.com/roflmuffin/CounterStrikeSharp/releases/download/v${CSS_VERSION}/counterstrikesharp-with-runtime-linux-${CSS_VERSION}.zip`,
    file: `css-${CSS_VERSION}.zip`,
  },
  matchzy: {
    url: `https://github.com/shobhit-pathak/MatchZy/releases/download/${MATCHZY_VERSION}/MatchZy-${MATCHZY_VERSION}-with-cssharp-linux.zip`,
    file: `matchzy-${MATCHZY_VERSION}.zip`,
  },
};

// Our two plugin projects: source dir → output folder name CSS expects.
const PLUGINS = [
  { dir: "cs2-deathmatch-mode", name: "IntradarkDeathmatch" },
  { dir: "cs2-deathmatch-stats", name: "IntradarkDmStats" },
];

// ── CLI ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
// In-zip path prefix for the addons. Redline overlays the zip INTO the server's
// `game/csgo` dir, so addons must sit at the zip root (empty prefix). Override
// with --root if a host overlays at a different base.
const ROOT_PREFIX = opt("root", "");
const ROOT_LABEL = ROOT_PREFIX || "(zip root → server's game/csgo)";
const ONLY = opt("only", null); // "deathmatch" | "pug" | null (both)
const SKIP_GAMEINFO = flag("no-gameinfo");
const DO_UPLOAD = flag("upload");
const VERSION = opt("version", stamp());

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

// ── small helpers ──────────────────────────────────────────────────────────
function sh(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) throw new Error(`\`${cmd} ${args.join(" ")}\` failed (exit ${r.status ?? r.error})`);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await exists(dest)) {
    console.log(`  cached  ${path.basename(dest)}`);
    return;
  }
  console.log(`  fetch   ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download ${url} → HTTP ${res.status}`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

/** Resolve the current Metamod:Source 2.0 Linux dev build (pruned over time). */
async function metamodUrl() {
  const base = "https://mms.alliedmods.net/mmsdrop/2.0/";
  const res = await fetch(base + "mmsource-latest-linux");
  if (!res.ok) throw new Error(`metamod latest pointer → HTTP ${res.status}`);
  const file = (await res.text()).trim();
  return { url: base + file, file };
}

const IS_WIN = process.platform === "win32";
// Windows ships bsdtar at System32; unlike Git-Bash GNU tar it reads .zip + .tar.gz,
// writes .zip, and doesn't mis-parse `C:` paths as a remote host. Call it directly
// (no shell) so backslash paths and the colon survive intact.
const BSDTAR = "C:\\Windows\\System32\\tar.exe";

function tarRun(args) {
  const r = spawnSync(IS_WIN ? BSDTAR : "tar", args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`tar ${args.join(" ")} failed (exit ${r.status ?? r.error})`);
}

async function extract(archive, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  if (IS_WIN || !archive.endsWith(".zip")) {
    // bsdtar handles zip + tar.gz; GNU tar handles tar.gz.
    tarRun(["-xf", archive, "-C", destDir]);
  } else {
    sh("unzip", ["-o", archive, "-d", destDir]); // non-Windows .zip
  }
}

/**
 * Zip the staged tree. With a prefix (e.g. `game/csgo`) the zip keeps that top
 * dir; with an empty prefix the staged top-level entries (`addons`, `cfg`) sit
 * at the zip root.
 */
function zipStage(stageDir, prefix, outZip) {
  const top = prefix.split("/").filter(Boolean)[0];
  const entries = top ? [top] : readdirSync(stageDir);
  if (IS_WIN) {
    tarRun(["-a", "-cf", outZip, "-C", stageDir, ...entries]); // bsdtar writes the zip
  } else {
    const quoted = entries.map((e) => `'${e}'`).join(" ");
    sh("sh", ["-c", `cd '${stageDir}' && zip -r -q '${outZip}' ${quoted}`]);
  }
}

// ── build steps ────────────────────────────────────────────────────────────
async function buildDlls() {
  // `publish` (not `build`) lays down the full runtimes/ tree — critical so the
  // Linux native libe_sqlite3.so ships for DmStats (server is Linux, host is Win).
  console.log("\n▶ building plugin DLLs (dotnet publish -c Release)…");
  for (const p of PLUGINS) {
    sh("dotnet", ["publish", "-c", "Release"], path.join(APP_DIR, p.dir));
  }
}

async function stageFor(target, metamod) {
  const stage = path.join(STAGE_DIR, target);
  await fs.rm(stage, { recursive: true, force: true });
  const root = path.join(stage, ...ROOT_PREFIX.split("/").filter(Boolean));
  await fs.mkdir(root, { recursive: true });

  // Metamod base — both targets need it.
  await extract(path.join(CACHE_DIR, metamod.file), root);

  if (target === "deathmatch") {
    await extract(path.join(CACHE_DIR, COMPONENTS.css.file), root);
    const pluginsDir = path.join(root, "addons", "counterstrikesharp", "plugins");
    for (const p of PLUGINS) {
      const out = path.join(APP_DIR, p.dir, "bin", "Release", "net8.0", "publish");
      if (!(await exists(out))) throw new Error(`missing build output: ${out} — did dotnet publish succeed?`);
      const dest = path.join(pluginsDir, p.name);
      await fs.mkdir(dest, { recursive: true });
      // Copy the whole output (plugin dll + its non-runtime deps from EnableDynamicLoading).
      await fs.cp(out, dest, { recursive: true });
      // The CSS API dll is provided by the runtime — never ship it.
      await fs.rm(path.join(dest, "CounterStrikeSharp.API.dll"), { force: true });
    }
  } else if (target === "pug") {
    // with-cssharp bundle lays down CSS + MatchZy + cfg under addons/ & cfg/.
    await extract(path.join(CACHE_DIR, COMPONENTS.matchzy.file), root);
  }

  await bakeGameinfo(root);

  await fs.mkdir(DIST_DIR, { recursive: true });
  const outZip = path.join(DIST_DIR, `${target}-${VERSION}.zip`);
  await fs.rm(outZip, { force: true });
  zipStage(stage, ROOT_PREFIX, outZip);
  const { size } = await fs.stat(outZip);
  console.log(`  ✔ ${path.basename(outZip)}  (${(size / 1e6).toFixed(1)} MB)`);
  return outZip;
}

/** Insert the metamod loader as the first entry of SearchPaths (idempotent). */
function patchGameinfo(content) {
  if (content.includes("csgo/addons/metamod")) return content; // already patched
  const patched = content.replace(/(SearchPaths\s*\{)/, "$1\n\t\t\tGame\tcsgo/addons/metamod");
  if (patched === content) {
    throw new Error("gameinfo.gi has no `SearchPaths {` block to patch — is it the real CS2 file?");
  }
  return patched;
}

/**
 * Locate the gameinfo.gi to bake. Prefer the live copy from a local working
 * CS2 server (CS2_LOCAL_SERVER_DIR) so it's always current; fall back to the
 * committed overlay copy.
 */
async function gameinfoSource() {
  const localDir = process.env.CS2_LOCAL_SERVER_DIR?.trim();
  if (localDir) {
    const live = path.join(localDir, "game", "csgo", "gameinfo.gi");
    if (await exists(live)) return { path: live, from: "local server" };
  }
  const overlay = path.join(OVERLAY_DIR, "gameinfo.gi");
  if (await exists(overlay)) return { path: overlay, from: "overlay" };
  return null;
}

/** Bake the patched gameinfo.gi into the overlay root so Metamod loads on boot. */
async function bakeGameinfo(root) {
  if (SKIP_GAMEINFO) return;
  const src = await gameinfoSource();
  if (!src) {
    console.warn(
      `  ⚠ no gameinfo.gi (set CS2_LOCAL_SERVER_DIR or drop one in scripts/cs2-overlay/) — shipping WITHOUT the metamod patch; Metamod won't load.`,
    );
    return;
  }
  const patched = patchGameinfo(await fs.readFile(src.path, "utf8"));
  await fs.writeFile(path.join(root, "gameinfo.gi"), patched, "utf8");
  console.log(`  + gameinfo.gi (metamod loader, from ${src.from})`);
}

async function upload(zipPath) {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ADMIN_KEY;
  if (!supaUrl || !key) {
    throw new Error("upload needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_ADMIN_KEY (run via `dotenv -e .env.local`).");
  }
  const name = path.basename(zipPath);
  const objectUrl = `${supaUrl.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${name}`;
  const body = await fs.readFile(zipPath);
  const res = await fetch(objectUrl, {
    method: "POST",
    headers: {
      // New-style sb_secret_ keys must also ride in `apikey` so the storage
      // gateway authenticates them instead of trying to parse a JWT.
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/zip",
      "x-upsert": "true",
    },
    body,
  });
  if (!res.ok) throw new Error(`upload ${name} → HTTP ${res.status}: ${await res.text()}`);
  return `${supaUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${name}`;
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const targets = ONLY ? [ONLY] : ["deathmatch", "pug"];
  console.log(`Packaging: ${targets.join(", ")}  (version ${VERSION}, root ${ROOT_LABEL})`);

  console.log("\n▶ resolving + downloading components…");
  const metamod = await metamodUrl();
  await download(metamod.url, path.join(CACHE_DIR, metamod.file));
  if (targets.includes("deathmatch")) await download(COMPONENTS.css.url, path.join(CACHE_DIR, COMPONENTS.css.file));
  if (targets.includes("pug")) await download(COMPONENTS.matchzy.url, path.join(CACHE_DIR, COMPONENTS.matchzy.file));

  if (targets.includes("deathmatch")) await buildDlls();

  console.log("\n▶ staging + zipping…");
  const zips = [];
  for (const t of targets) zips.push(await stageFor(t, metamod));

  if (DO_UPLOAD) {
    console.log("\n▶ uploading to Supabase…");
    for (const z of zips) {
      const url = await upload(z);
      console.log(`  ✔ ${url}`);
    }
    console.log("\nSet these as ZIP_URL when provisioning (deathmatch vs pug).");
  } else {
    console.log(`\nZips in ${path.relative(APP_DIR, DIST_DIR)}. Re-run with --upload to push to Supabase.`);
  }

  console.log(
    `\n⚠ After a CS2 game update, re-pull the server's gameinfo.gi into scripts/cs2-overlay/ and repackage (the baked copy could otherwise overwrite a newer one).`,
  );
}

main().catch((err) => {
  console.error("\n✗", err.message);
  process.exit(1);
});
