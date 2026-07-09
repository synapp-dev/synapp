#!/usr/bin/env node
/**
 * Verify Bullyproof Notion sprints/tasks match admin-portal-sprint-jun-2026.md plan.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SPRINTS } from "./seed-admin-portal-notion.mjs";

function loadEnv() {
  const envPath = path.join(os.homedir(), ".cursor", "notion.env");
  if (!fs.existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();
const TOKEN = process.env.NOTION_BULLYPROOF_TOKEN;
if (!TOKEN) throw new Error("NOTION_BULLYPROOF_TOKEN not set");

const PRIORITY = { P0: "1 - Must Have", P1: "2 - Should Have", P2: "3 - Could Have" };
const SPRINTS_DB = "589f7050-80ed-82d9-964f-015f8cafa09a";
const TASKS_DB = "8aff7050-80ed-826e-b00d-013fb1792c6a";

async function queryAll(dbId) {
  let all = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    all.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return all;
}

function norm(s) {
  return s
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const issues = [];
const ok = [];

// Expected from plan doc schedule table
const EXPECTED_SPRINT_STATUS = {
  "Sidebar & Quick Fixes": "Past",
  "Prepare / Teach Lessons (Bugs & UX)": "Past",
  "Admin Dashboard Redesign": "Current",
  "Culture Rating": "Next",
};
const EXPECTED_COUNTS = {
  "Sidebar & Quick Fixes": 3,
  "Prepare / Teach Lessons (Bugs & UX)": 9,
  "Admin Dashboard Redesign": 21, // doc says 22 but lists 21 tasks
  "Culture Rating": 8,
  Reports: 5,
  "Classes & Teachers UX": 4,
  "Content Types": 4,
  "Year Reset / Admin Operations": 4,
  "Lesson Feedback": 2,
};

const sprints = await queryAll(SPRINTS_DB);
const tasks = await queryAll(TASKS_DB);

console.log("=== BULLYPROOF NOTION VERIFICATION ===\n");
console.log(`Sprints in Notion: ${sprints.length} (expected 9)`);
console.log(`Tasks in Notion: ${tasks.length} (expected 60)\n`);

if (sprints.length !== 9) issues.push(`Sprint count: got ${sprints.length}, expected 9`);
else ok.push("Sprint count: 9");

if (tasks.length !== 60) issues.push(`Task count: got ${tasks.length}, expected 60`);
else ok.push("Task count: 60");

const sprintById = Object.fromEntries(
  sprints.map((s) => [s.id, s.properties["Sprint name"].title[0]?.plain_text])
);
const sprintByName = Object.fromEntries(
  sprints.map((s) => [s.properties["Sprint name"].title[0]?.plain_text, s])
);

// --- Sprint checks ---
console.log("--- Sprints ---");
for (const planned of SPRINTS) {
  const notion = sprintByName[planned.name];
  if (!notion) {
    issues.push(`Missing sprint: ${planned.name}`);
    continue;
  }
  const dates = notion.properties.Dates.date;
  const status = notion.properties["Sprint status"].status.name;
  const startOk = dates?.start === planned.start;
  const endOk = dates?.end === planned.end;
  const statusOk =
    status === (EXPECTED_SPRINT_STATUS[planned.name] ?? "Future");

  const line = `${planned.name}: ${dates?.start}..${dates?.end} [${status}]`;
  if (startOk && endOk && statusOk) ok.push(`Sprint dates/status: ${line}`);
  else {
    if (!startOk || !endOk)
      issues.push(
        `Sprint dates wrong for "${planned.name}": got ${dates?.start}..${dates?.end}, expected ${planned.start}..${planned.end}`
      );
    if (!statusOk)
      issues.push(
        `Sprint status wrong for "${planned.name}": got "${status}", expected "${EXPECTED_SPRINT_STATUS[planned.name] ?? "Future"}"`
      );
  }

  // June only check
  if (dates?.end && dates.end > "2026-06-30") {
    issues.push(`Sprint "${planned.name}" extends past June: end=${dates.end}`);
  }
}

// Extra sprints not in plan?
for (const s of sprints) {
  const name = s.properties["Sprint name"].title[0]?.plain_text;
  if (!SPRINTS.find((p) => p.name === name)) {
    issues.push(`Unexpected sprint in Notion: ${name}`);
  }
}

// --- Task checks ---
console.log("\n--- Tasks by sprint ---");
const tasksBySprint = {};
for (const t of tasks) {
  const rel = t.properties.Sprint?.relation ?? [];
  const name = t.properties["Task name"].title[0]?.plain_text;
  if (rel.length !== 1) {
    issues.push(`Task "${name}" has ${rel.length} sprint links (expected 1)`);
    continue;
  }
  const sprintName = sprintById[rel[0].id];
  if (!tasksBySprint[sprintName]) tasksBySprint[sprintName] = [];
  tasksBySprint[sprintName].push(t);
}

for (const [sprintName, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
  const actual = tasksBySprint[sprintName]?.length ?? 0;
  const mark = actual === expectedCount ? "OK" : "MISMATCH";
  console.log(`  ${mark} ${sprintName}: ${actual}/${expectedCount}`);
  if (actual !== expectedCount) {
    issues.push(`Task count for "${sprintName}": got ${actual}, expected ${expectedCount}`);
  }
}

// Match each planned task to Notion
console.log("\n--- Task name / priority / due / status ---");
let matched = 0;
let nameMismatches = [];
let priorityMismatches = [];
let dueMismatches = [];
let statusMismatches = [];

for (const sprint of SPRINTS) {
  const notionTasks = tasksBySprint[sprint.name] ?? [];
  const notionByNorm = new Map(notionTasks.map((t) => [norm(t.properties["Task name"].title[0]?.plain_text ?? ""), t]));

  for (const planned of sprint.tasks) {
    const key = norm(planned.name);
    const notionTask = notionByNorm.get(key);
    if (!notionTask) {
      // fuzzy: find closest
      const fuzzy = notionTasks.find((t) => {
        const n = norm(t.properties["Task name"].title[0]?.plain_text ?? "");
        return n.includes(key.slice(0, 40)) || key.includes(n.slice(0, 40));
      });
      if (fuzzy) {
        nameMismatches.push({
          sprint: sprint.name,
          planned: planned.name,
          notion: fuzzy.properties["Task name"].title[0]?.plain_text,
          note: "fuzzy match only",
        });
        matched++;
      } else {
        nameMismatches.push({ sprint: sprint.name, planned: planned.name, notion: null });
      }
      continue;
    }
    matched++;

    const priority = notionTask.properties.Priority?.select?.name;
    const expectedPriority = PRIORITY[planned.priority];
    if (priority !== expectedPriority) {
      priorityMismatches.push({ name: planned.name, got: priority, expected: expectedPriority });
    }

    const due = notionTask.properties.Due?.date?.start;
    if (due !== sprint.end) {
      dueMismatches.push({ name: planned.name, got: due, expected: sprint.end });
    }

    const status = notionTask.properties.Status?.status?.name;
    const releasedTasks = new Set([
      "Rename sidebar Content → Preview Lessons",
      "Rename sidebar Lessons → Teach Lessons",
      "Support button opens email to support@bullyproofaustralia.org.au (CC Jeff + Glenn)",
      "Blank screen fix — Grade ½ combinations always show message explaining invalid selection + options",
      "Multi-class different levels — guided options: Back / Select one class / Choose compromise lesson",
      "Take over lesson — investigate regression; add teacher permission to allow takeover (or remove feature)",
      "Back to lesson button not navigating — fix",
      "Recommended lesson bug — mixed classes incorrectly show same L2 Senior Secondary",
      "Other lessons list sorted by year level (½, ¾, … 10, 11, 12)",
      "Only 3 lessons showing (L8, L9, L10) — investigate and fix display",
      "Lessons reset to L1 after completing all 10 — clarify audit log behaviour; confirm data retention",
      "Composite classes appear as one class when selecting multiple classes at different levels",
    ]);
    if (releasedTasks.has(planned.name)) {
      if (status !== "Released") {
        statusMismatches.push({ name: planned.name, got: status, expected: "Released" });
      }
    } else if (status !== "Not started") {
      statusMismatches.push({ name: planned.name, got: status });
    }
  }

  // Orphan notion tasks not in plan
  const plannedNorms = new Set(sprint.tasks.map((t) => norm(t.name)));
  for (const t of notionTasks) {
    const n = norm(t.properties["Task name"].title[0]?.plain_text ?? "");
    if (!plannedNorms.has(n)) {
      const fuzzyFound = sprint.tasks.some((p) => {
        const pn = norm(p.name);
        return n.includes(pn.slice(0, 40)) || pn.includes(n.slice(0, 40));
      });
      if (!fuzzyFound) {
        issues.push(`Extra task in Notion for "${sprint.name}": ${t.properties["Task name"].title[0]?.plain_text}`);
      }
    }
  }
}

if (nameMismatches.filter((m) => !m.notion).length === 0 && nameMismatches.filter((m) => m.note).length === 0) {
  ok.push(`All ${matched} task names matched exactly`);
} else {
  const missing = nameMismatches.filter((m) => !m.notion);
  const fuzzy = nameMismatches.filter((m) => m.note);
  if (missing.length) issues.push(`${missing.length} tasks missing from Notion`);
  if (fuzzy.length) {
    for (const f of fuzzy) {
      issues.push(`Name wording differs: planned "${f.planned}" vs notion "${f.notion}"`);
    }
  }
}

if (priorityMismatches.length === 0) ok.push("All priorities match (P0/P1/P2 → Must/Should/Could Have)");
else for (const p of priorityMismatches) issues.push(`Priority wrong for "${p.name}": got ${p.got}, expected ${p.expected}`);

if (dueMismatches.length === 0) ok.push("All due dates match sprint end dates");
else for (const d of dueMismatches) issues.push(`Due wrong for "${d.name}": got ${d.got}, expected ${d.expected}`);

if (statusMismatches.length === 0) ok.push("All task statuses match expected (Sprints 1–2 Released, others Not started)");
else for (const s of statusMismatches) issues.push(`Status wrong for "${s.name}": got ${s.got}`);

// Priority totals
const pTotals = { P0: 0, P1: 0, P2: 0 };
for (const sprint of SPRINTS) for (const t of sprint.tasks) pTotals[t.priority]++;
console.log("\n--- Priority breakdown (plan) ---");
console.log(`  P0: ${pTotals.P0}, P1: ${pTotals.P1}, P2: ${pTotals.P2}`);

const notionPTotals = {};
for (const t of tasks) {
  const p = t.properties.Priority?.select?.name ?? "none";
  notionPTotals[p] = (notionPTotals[p] ?? 0) + 1;
}
console.log("--- Priority breakdown (Notion) ---");
console.log(`  Must Have: ${notionPTotals["1 - Must Have"] ?? 0}`);
console.log(`  Should Have: ${notionPTotals["2 - Should Have"] ?? 0}`);
console.log(`  Could Have: ${notionPTotals["3 - Could Have"] ?? 0}`);

// Doc table says 22 for dashboard - note discrepancy
console.log("\n--- Known doc nuance ---");
console.log("  Schedule table lists Dashboard as 22 tasks; detailed sections list 21. Notion has 21 (correct per detail).");

console.log("\n=== SUMMARY ===");
console.log(`PASS: ${ok.length} checks`);
for (const o of ok) console.log(`  ✓ ${o}`);
if (issues.length === 0) {
  console.log("\n✅ ALL CHECKS PASSED — Notion matches the plan.");
} else {
  console.log(`\nFAIL: ${issues.length} issues`);
  for (const i of issues) console.log(`  ✗ ${i}`);
  process.exit(1);
}
