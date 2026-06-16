// Scrape strengthlevel.com strength standards for bodyweight movements and seed
// them into gym_exercise_standards as TOTAL-weight 1RM tables.
//
// Why this script exists: for plate-loaded lifts strengthlevel publishes the
// absolute 1RM by bodyweight, which drops straight into our standards table. For
// bodyweight moves (pull-up, dip, …) it instead publishes the *added* weight
// (signed: negative = assisted, positive = belt weight). Our rating pipeline
// compares a single est-1RM against one weight table, so we normalise these to
// total weight = bodyweight + added, matching how getExerciseBests folds the
// lifter's bodyweight into the logged load. The result is a drop-in
// [bodyweight_kg, beginner, novice, intermediate, advanced, elite] table.
//
// Usage:
//   node scripts/scrape-bodyweight-standards.mjs --dry   # print, don't write
//   node scripts/scrape-bodyweight-standards.mjs         # upsert to Supabase
//
// Re-run any time to refresh. Only the listed bodyweight slugs are touched.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DRY = process.argv.includes("--dry");

const LB_TO_KG = 0.45359237;

// strengthlevel slugs for our bodyweight catalog entries.
const SLUGS = ["pull-ups", "chin-ups", "dips", "hanging-leg-raise"];

// ── Minimal .env.local loader (URL + service-role key) ───────────────────────
function loadEnv() {
  const env = {};
  try {
    const text = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* fall back to process.env */
  }
  return { ...env, ...process.env };
}

// ── HTML table parsing ───────────────────────────────────────────────────────
const strip = (s) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();

function tablesOf(html) {
  return (html.match(/<table[\s\S]*?<\/table>/g) || []).map((t) => {
    const headers = [...t.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => strip(m[1]));
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
      .map((r) => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => strip(m[1])))
      .filter((cells) => cells.length > 0);
    return { headers, rows };
  });
}

// Parse a weight cell like "+52 lb", "-19 lb", "73 kg". Returns { value, unit }.
function parseWeight(cell) {
  const m = cell.match(/(-?\+?\d+(?:\.\d+)?)\s*(lb|kg)/i);
  if (!m) return null;
  return { value: parseFloat(m[1].replace("+", "")), unit: m[2].toLowerCase() };
}

const LEVEL_HEADERS = ["beg", "nov", "int", "adv", "elite"];

// By-bodyweight level tables: header row "BW Beg. Nov. Int. Adv. Elite"
// (excludes the by-age tables). Each is tagged `weight` when its cells carry a
// unit (added 1RM weight) or `reps` otherwise (rep standard).
function bodyweightLevelTables(html) {
  return tablesOf(html)
    .filter((t) => {
      const h = t.headers.map((x) => x.toLowerCase());
      return h[0] === "bw" && h.length >= 6 && LEVEL_HEADERS.every((lvl, i) => (h[i + 1] || "").startsWith(lvl));
    })
    .map((t) => ({
      ...t,
      kind: t.rows.some((r) => r.slice(1).some((c) => /\b(lb|kg)\b/i.test(c))) ? "weight" : "reps",
    }));
}

// Convert one by-bodyweight table to total-weight kg rows:
// [bodyweight_kg, beginner, novice, intermediate, advanced, elite].
//   weight: total = bodyweight + added weight (negative when assisted).
//   reps:   total = Epley 1RM of `reps` at bodyweight = bodyweight*(1+reps/30),
//           matching how getExerciseBests estimates an unweighted set. Reps
//           tables carry no unit, so the bodyweight unit is inferred from its
//           magnitude (kg axes top out ~140; lb axes run ~110–320).
function toTotalKgRows(table) {
  // Bodyweight-column → kg. Weight tables share the cells' unit; reps tables are
  // inferred from the axis magnitude.
  const bwVals = table.rows.map((c) => parseFloat(c[0])).filter(Number.isFinite);
  let bwToKg;
  if (table.kind === "weight") {
    const unit = table.rows.flatMap((c) => c.slice(1).map(parseWeight)).find((p) => p)?.unit;
    bwToKg = (v) => (unit === "kg" ? v : v * LB_TO_KG);
  } else {
    const isLb = Math.max(...bwVals) > 175;
    bwToKg = (v) => (isLb ? v * LB_TO_KG : v);
  }

  const out = [];
  for (const cells of table.rows) {
    if (cells.length < 6) continue;
    const bwRaw = parseFloat(cells[0]);
    if (!Number.isFinite(bwRaw)) continue;
    const bwKg = bwToKg(bwRaw);

    let totals;
    if (table.kind === "weight") {
      const levels = cells.slice(1, 6).map(parseWeight);
      if (levels.some((l) => l == null)) continue;
      const toKg = (v) => (levels[0].unit === "kg" ? v : v * LB_TO_KG);
      totals = levels.map((l) => toKg(bwRaw + l.value));
    } else {
      // "< 1" → 0 reps (can't complete a single bodyweight rep).
      const reps = cells.slice(1, 6).map((c) => (/</.test(c) ? 0 : parseFloat(c)));
      if (reps.some((r) => !Number.isFinite(r))) continue;
      totals = reps.map((r) => bwKg * (1 + r / 30));
    }
    out.push([Math.round(bwKg), ...totals.map((v) => Math.round(v))]);
  }
  // Sort by bodyweight ascending (thresholdsAt expects it).
  return out.sort((a, b) => a[0] - b[0]);
}

async function scrapeSlug(slug) {
  const url = `https://strengthlevel.com/strength-standards/${slug}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const html = await res.text();
  const all = bodyweightLevelTables(html);
  // Prefer added-weight tables (handle weighted reps); fall back to rep tables
  // for pure-bodyweight moves that publish no weight standard.
  const weight = all.filter((t) => t.kind === "weight");
  const tables = weight.length >= 2 ? weight : all.filter((t) => t.kind === "reps");
  const kind = weight.length >= 2 ? "weight" : "reps";
  if (tables.length < 2)
    throw new Error(`${slug}: expected male+female BW tables, found ${tables.length}`);
  const male = toTotalKgRows(tables[0]);
  const female = toTotalKgRows(tables[1]);
  if (male.length === 0 || female.length === 0)
    throw new Error(`${slug}: parsed 0 rows (male=${male.length} female=${female.length})`);
  return { slug, male, female, source_url: url, kind };
}

async function main() {
  const env = loadEnv();
  const results = [];
  for (const slug of SLUGS) {
    const r = await scrapeSlug(slug);
    results.push(r);
    const m = r.male;
    console.log(
      `\n${slug} [${r.kind}]: male ${m.length} rows  (bw ${m[0][0]}–${m.at(-1)[0]}kg)  ` +
        `intermediate ${m[0][3]}→${m.at(-1)[3]}kg`
    );
    console.log(`  sample male row: ${JSON.stringify(m[0])}  …  ${JSON.stringify(m.at(-1))}`);
  }

  if (DRY) {
    console.log("\n--dry: not writing. Re-run without --dry to upsert.");
    return;
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (const r of results) {
    const { error } = await supabase.from("gym_exercise_standards").upsert(
      {
        strength_level_slug: r.slug,
        male: r.male,
        female: r.female,
        source_url: r.source_url,
      },
      { onConflict: "strength_level_slug" }
    );
    if (error) throw new Error(`${r.slug}: ${error.message}`);
    console.log(`upserted ${r.slug}`);
  }
  console.log(`\nDone — ${results.length} bodyweight standards seeded.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
