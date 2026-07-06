/**
 * Generates the OSS Bill of Materials (SDA 4.4 handover deliverable D7).
 *
 * Usage (from apps/bullyproof):
 *   pnpm licenses list --prod --json > /tmp/licenses.json (or pipe directly)
 *   node scripts/generate-bill-of-materials.mjs
 *
 * Writes docs/handover/bill-of-materials.md and .csv from the production
 * dependency tree. Re-run at Final Delivery so the register matches the
 * shipped lockfile.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(appDir, "docs", "handover");

const raw = execSync("pnpm licenses list --prod --json", {
  cwd: appDir,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const byLicense = JSON.parse(raw);

const rows = [];
for (const [license, packages] of Object.entries(byLicense)) {
  for (const pkg of packages) {
    rows.push({
      name: pkg.name,
      versions: (pkg.versions ?? []).join(", "),
      license,
      homepage: pkg.homepage ?? "",
    });
  }
}
rows.sort((a, b) => a.name.localeCompare(b.name));

const generatedAt = new Date().toISOString().slice(0, 10);

const md = [
  "# Bullyproof - Open Source Bill of Materials (D7)",
  "",
  `> Production dependencies of apps/bullyproof. Generated ${generatedAt} via`,
  "> `node scripts/generate-bill-of-materials.mjs`. Regenerate at Final Delivery.",
  "",
  `Total packages: ${rows.length}`,
  "",
  "| Package | Version(s) | Licence | Homepage |",
  "|---------|------------|---------|----------|",
  ...rows.map(
    (r) =>
      `| ${r.name} | ${r.versions} | ${r.license} | ${r.homepage} |`
  ),
  "",
].join("\n");

const csvEscape = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = [
  "Package,Versions,Licence,Homepage",
  ...rows.map((r) =>
    [r.name, r.versions, r.license, r.homepage].map(csvEscape).join(",")
  ),
].join("\r\n");

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "bill-of-materials.md"), md);
writeFileSync(join(outDir, "bill-of-materials.csv"), csv);

const licenseCounts = {};
for (const row of rows) {
  licenseCounts[row.license] = (licenseCounts[row.license] ?? 0) + 1;
}
console.log(`Wrote ${rows.length} packages to docs/handover/bill-of-materials.{md,csv}`);
console.log("Licence summary:", licenseCounts);
