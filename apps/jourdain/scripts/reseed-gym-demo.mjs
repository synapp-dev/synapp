// One-off: regenerate the gym demo dataset for the demo user, skewed to a new
// lifter (mostly beginner, a little novice). Faithful port of
// lib/gym/service.ts → generateDemoData (kept in sync by hand); run with the
// service-role key so it needs no app session.
//
//   node scripts/reseed-gym-demo.mjs           # reseed the demo user
//   node scripts/reseed-gym-demo.mjs --dry      # report targets, don't write
//
// The source-of-truth generator (the in-app "regenerate" button) carries the
// same fixes; this script just lets us run it now.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DRY = process.argv.includes("--dry");

const WEEKS = 13;
const PER_WEEK = 3;
const START_FRAC = 0.62;
const DEMO_TAG = "[demo]";
const DEMO_SOURCE = "demo";

const STRENGTH_LEVELS = ["beginner", "novice", "intermediate", "advanced", "elite"];

const DEMO_TARGET_E1RM_BY_SLUG = {
  "smith-bench-press": 85,
  "smith-standing-calf-raise": 210,
};

const DEMO_FALLBACK_E1RM = {
  quads: 150, hamstrings: 110, glutes: 130, adductors: 55,
  calves: 110, tibialis: 35, back_lats: 90, back_traps: 80, back_lower: 100,
  chest_upper: 75, chest_middle: 90, chest_lower: 80,
  delts_front: 55, delts_side: 18, delts_rear: 16,
  biceps: 40, triceps: 45, forearms: 35,
  abs: 45, obliques: 35, serratus: 25,
};

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* fall back to process.env */
  }
  return { ...env, ...process.env };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Linear-interpolate the [bw, beginner..elite] standards table to `bodyweight`.
function thresholdsAt(rows, bodyweight) {
  if (!rows || rows.length === 0 || !(bodyweight > 0)) return null;
  const sorted = [...rows].sort((a, b) => a[0] - b[0]);
  const pick = (r) => ({ beginner: r[1], novice: r[2], intermediate: r[3], advanced: r[4], elite: r[5] });
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (bodyweight <= first[0]) return pick(first);
  if (bodyweight >= last[0]) return pick(last);
  let lo = first, hi = last;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (bodyweight >= sorted[i][0] && bodyweight <= sorted[i + 1][0]) { lo = sorted[i]; hi = sorted[i + 1]; break; }
  }
  const t = (bodyweight - lo[0]) / (hi[0] - lo[0]);
  const lerp = (a, b) => Math.round((a + (b - a) * t) * 10) / 10;
  return {
    beginner: lerp(lo[1], hi[1]), novice: lerp(lo[2], hi[2]), intermediate: lerp(lo[3], hi[3]),
    advanced: lerp(lo[4], hi[4]), elite: lerp(lo[5], hi[5]),
  };
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Demo user: whoever owns the demo sessions, else the (single) library owner.
  let userId;
  const demoSess = await supabase.from("gym_sessions").select("user_id").eq("notes", DEMO_TAG).limit(1);
  if (demoSess.error) throw new Error(demoSess.error.message);
  userId = demoSess.data?.[0]?.user_id;
  if (!userId) {
    const any = await supabase.from("gym_exercises").select("user_id").limit(1);
    userId = any.data?.[0]?.user_id;
  }
  if (!userId) throw new Error("No demo user found");

  const exRes = await supabase
    .from("gym_exercises")
    .select("id, slug, name, subgroup, strength_level_slug, is_bodyweight")
    .eq("user_id", userId)
    .eq("archived", false);
  if (exRes.error) throw new Error(exRes.error.message);
  const exercises = exRes.data;

  const stdRes = await supabase.from("gym_exercise_standards").select("strength_level_slug, male");
  if (stdRes.error) throw new Error(stdRes.error.message);
  const stdMap = new Map(stdRes.data.map((s) => [s.strength_level_slug, s.male]));

  const bwRes = await supabase
    .from("body_weights")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("measured_at", { ascending: false })
    .limit(1);
  const BW = bwRes.data?.[0]?.weight_kg ? Number(bwRes.data[0].weight_kg) : 82.5;

  // ── finalE1rm / fracSeries / weightFor — mirrors generateDemoData ──────────
  const finalE1rm = (ex) => {
    const override = DEMO_TARGET_E1RM_BY_SLUG[ex.slug];
    if (override != null) return override;
    const rows = ex.strength_level_slug ? stdMap.get(ex.strength_level_slug) : null;
    const th = rows ? thresholdsAt(rows, BW) : null;
    if (th) {
      const bands = ["beginner", "beginner", "beginner", "beginner", "beginner", "novice", "novice"];
      const band = bands[hashStr(ex.id) % bands.length];
      const next = band === "beginner" ? "novice" : band === "novice" ? "intermediate" : "advanced";
      return th[band] + (th[next] - th[band]) * 0.25;
    }
    return DEMO_FALLBACK_E1RM[ex.subgroup] ?? 30;
  };

  const fracCache = new Map();
  const fracSeries = (ex) => {
    if (fracCache.has(ex.id)) return fracCache.get(ex.id);
    const gains = [];
    for (let i = 0; i < WEEKS - 1; i++) {
      const r = (hashStr(`${ex.id}#${i}`) % 1000) / 1000;
      let g = r < 0.25 ? 0.05 : r > 0.88 ? 2.6 : 0.7 + r;
      g *= 1 + 0.6 * (1 - i / (WEEKS - 1));
      gains.push(g);
    }
    const cum = [0];
    for (let i = 0; i < gains.length; i++) cum.push(cum[i] + gains[i]);
    const total = cum[cum.length - 1] || 1;
    const series = cum.map((c) => START_FRAC + (1 - START_FRAC) * (c / total));
    fracCache.set(ex.id, series);
    return series;
  };

  const weightFor = (ex, week) => {
    const e1rm = finalE1rm(ex) * (fracSeries(ex)[week] ?? 1);
    const load = e1rm / (1 + 10 / 30);
    const w = ex.is_bodyweight ? load - BW : load;
    const rounded = Math.round(w / 1.25) * 1.25;
    return ex.is_bodyweight ? rounded : Math.max(1.25, rounded);
  };

  if (DRY) {
    console.log(`Demo user ${userId} · bodyweight ${BW}kg · ${exercises.length} exercises\n`);
    const sample = exercises
      .filter((e) => e.is_bodyweight || ["cable-serratus-punch", "smith-bench-press", "smith-squat"].includes(e.slug))
      .map((e) => `  ${e.name}: target best ${Math.round(finalE1rm(e))}kg est-1RM, final added ${weightFor(e, WEEKS - 1)}kg`);
    console.log(sample.join("\n"));
    console.log("\n--dry: not writing.");
    return;
  }

  // ── Clear prior demo (cascade removes session_exercises + sets) ────────────
  const delS = await supabase.from("gym_sessions").delete().eq("user_id", userId).eq("notes", DEMO_TAG);
  if (delS.error) throw new Error(delS.error.message);
  await supabase.from("body_weights").delete().eq("user_id", userId).eq("source", DEMO_SOURCE);

  const today = new Date();
  const isoDate = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  const sessionRows = [];
  const sessionMeta = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let b = 0; b < PER_WEEK; b++) {
      const daysAgo = (WEEKS - 1 - w) * 7 + (PER_WEEK - 1 - b) * 2;
      const date = isoDate(daysAgo);
      sessionRows.push({
        user_id: userId,
        title: `Demo · week ${w + 1} day ${b + 1}`,
        performed_on: date,
        started_at: `${date}T18:00:00Z`,
        ended_at: `${date}T19:05:00Z`,
        status: "completed",
        notes: DEMO_TAG,
      });
      sessionMeta.push({ week: w, bucket: b });
    }
  }
  const sIns = await supabase.from("gym_sessions").insert(sessionRows).select("id");
  if (sIns.error) throw new Error(sIns.error.message);
  const sessions = sIns.data;

  const seRows = [];
  const seMeta = [];
  sessions.forEach((s, i) => {
    const { bucket, week } = sessionMeta[i];
    const exs = exercises.filter((_, idx) => idx % PER_WEEK === bucket);
    exs.forEach((ex, oi) => {
      seRows.push({
        user_id: userId,
        session_id: s.id,
        exercise_id: ex.id,
        exercise_name: ex.name,
        order_index: oi,
        target_sets: 3,
      });
      seMeta.push({ ex, week });
    });
  });
  const seIns = await supabase.from("gym_session_exercises").insert(seRows).select("id");
  if (seIns.error) throw new Error(seIns.error.message);
  const ses = seIns.data;

  const setRows = [];
  ses.forEach((se, i) => {
    const { ex, week } = seMeta[i];
    const w = weightFor(ex, week);
    [10, 9, 8].forEach((reps, si) => {
      setRows.push({
        user_id: userId,
        session_exercise_id: se.id,
        set_index: si,
        weight: w,
        reps,
        rpe: 7 + si,
        is_warmup: false,
        completed: true,
      });
    });
  });
  // Insert in chunks to stay well under any payload limits.
  for (let i = 0; i < setRows.length; i += 500) {
    const { error } = await supabase.from("gym_sets").insert(setRows.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }

  console.log(`Reseeded demo for ${userId}: ${sessions.length} sessions, ${setRows.length} sets.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
