/**
 * Build the plugin DLLs, deploy them into the local CS2 server for testing, AND
 * rebundle + upload the overlay zips (so a freshly-provisioned server gets this
 * same build).
 *   build (dotnet publish) → copy into CS2_LOCAL_SERVER_DIR's plugins folder
 *   → package-cs2-plugins.mjs --upload --prune  (skip with --local-only)
 *
 * Run: pnpm deploy:cs2-local                     (both plugins + rebundle/upload)
 *      pnpm deploy:cs2-local -- --local-only     (local copy only, no zip upload)
 *      pnpm deploy:cs2-local -- --only IntradarkDeathmatch
 *
 * CounterStrikeSharp hot-reloads on file change. On Windows a loaded DLL can be
 * locked — if the copy errors with EBUSY, `css_plugins unload <name>` in the
 * server console first, deploy, then `css_plugins load <name>`.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PLUGINS = [
  { dir: "cs2-deathmatch-mode", name: "IntradarkDeathmatch" },
  { dir: "cs2-deathmatch-stats", name: "IntradarkDmStats" },
];

const argv = process.argv.slice(2);
const onlyIdx = argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;
// By default we also rebundle + upload the zips (so a freshly-provisioned server
// gets this build). Pass --local-only to skip that for a fast local-only loop.
const LOCAL_ONLY = argv.includes("--local-only");

function sh(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) throw new Error(`\`${cmd} ${args.join(" ")}\` failed (exit ${r.status ?? r.error})`);
}

async function main() {
  const serverDir = process.env.CS2_LOCAL_SERVER_DIR?.trim();
  if (!serverDir) {
    throw new Error("CS2_LOCAL_SERVER_DIR not set in .env.local (e.g. S:/cs2-server). Run via `pnpm deploy:cs2-local`.");
  }
  const pluginsRoot = path.join(serverDir, "game", "csgo", "addons", "counterstrikesharp", "plugins");

  const targets = ONLY ? PLUGINS.filter((p) => p.name === ONLY) : PLUGINS;
  if (!targets.length) throw new Error(`--only ${ONLY}: unknown plugin`);

  for (const p of targets) {
    console.log(`\n▶ ${p.name}`);
    sh("dotnet", ["publish", "-c", "Release"], path.join(APP_DIR, p.dir));
    const out = path.join(APP_DIR, p.dir, "bin", "Release", "net8.0", "publish");
    const dest = path.join(pluginsRoot, p.name);
    await fs.rm(dest, { recursive: true, force: true });
    await fs.mkdir(dest, { recursive: true });
    await fs.cp(out, dest, { recursive: true });
    // CSS API dll is provided by the runtime — never ship it alongside the plugin.
    await fs.rm(path.join(dest, "CounterStrikeSharp.API.dll"), { force: true });
    console.log(`  → ${dest}`);
  }

  console.log("\n✔ deployed to local server. In the server console, reload:");
  for (const p of targets) console.log(`    css_plugins reload ${p.name}`);

  // Also rebundle + upload the overlay zips (and prune old) so the provision
  // dropdown / a new server gets this exact build. Inherits env from dotenv.
  if (!LOCAL_ONLY) {
    console.log("\n▶ rebundling + uploading zips (for launching new servers)…");
    sh("node", [path.join(APP_DIR, "scripts", "package-cs2-plugins.mjs"), "--upload", "--prune"], APP_DIR);
  } else {
    console.log("\n(skipped zip rebundle — --local-only)");
  }
}

main().catch((err) => {
  console.error("\n✗", err.message);
  process.exit(1);
});
