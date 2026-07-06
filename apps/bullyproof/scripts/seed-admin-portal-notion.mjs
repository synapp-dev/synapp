#!/usr/bin/env node
/**
 * Seed Bullyproof Notion: Admin Portal Jun 2026 sprints + engineering tasks.
 * Source: apps/bullyproof/docs/sprints/admin-portal-sprint-jun-2026.md
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ENGINEERING_TASKS_DB = "8aff7050-80ed-826e-b00d-013fb1792c6a";

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

const TOKEN = () => {
  loadEnv();
  const t = process.env.NOTION_BULLYPROOF_TOKEN;
  if (!t) throw new Error("NOTION_BULLYPROOF_TOKEN not set");
  return t;
};

async function notion(method, endpoint, body) {
  const res = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`${method} ${endpoint}: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

const PRIORITY = { P0: "1 - Must Have", P1: "2 - Should Have", P2: "3 - Could Have" };

function tagsFor(surfaceTag) {
  const map = {
    "academy-sidebar": ["Admin UI"],
    "teach-lessons": ["Admin UI"],
    audit: ["Admin UI", "Database"],
    "admin-sidebar": ["Admin UI"],
    "admin-dashboard": ["Admin UI", "API"],
    data: ["Database", "API"],
    logic: ["API"],
    "admin-settings": ["Admin UI", "Database"],
    "culture-rating": ["Admin UI", "API"],
    "academy-reports": ["Admin UI"],
    "school-reports": ["Admin UI", "API"],
    "school-classes": ["Admin UI"],
    "school-teachers": ["Admin UI"],
    "admin-content": ["Admin UI"],
    "admin-schools": ["Admin UI"],
    "admin-resources": ["Admin UI"],
    "admin-portal": ["Admin UI", "Database"],
    docs: ["Admin UI"],
    product: ["Admin UI"],
  };
  const tags = map[surfaceTag] ?? ["Admin UI"];
  return [...new Set(tags)];
}

export const SPRINTS = [
  {
    id: "374f7050-80ed-80d9-818d-cabc11cb26dc",
    name: "Sidebar & Quick Fixes",
    start: "2026-06-01",
    end: "2026-06-02",
    status: "Past",
    tasks: [
      { name: "Rename sidebar Content → Preview Lessons", priority: "P0", tag: "academy-sidebar" },
      { name: "Rename sidebar Lessons → Teach Lessons", priority: "P0", tag: "academy-sidebar" },
      {
        name: "Support button opens email to support@bullyproofaustralia.org.au (CC Jeff + Glenn)",
        priority: "P0",
        tag: "academy-sidebar",
      },
    ],
  },
  {
    id: "374f7050-80ed-806c-a8cc-c7eb8e24002c",
    name: "Prepare / Teach Lessons (Bugs & UX)",
    start: "2026-06-03",
    end: "2026-06-06",
    status: "Past",
    tasks: [
      {
        name: "Blank screen fix — Grade ½ combinations always show message explaining invalid selection + options",
        priority: "P0",
        tag: "teach-lessons",
      },
      {
        name: "Multi-class different levels — guided options: Back / Select one class / Choose compromise lesson",
        priority: "P0",
        tag: "teach-lessons",
      },
      {
        name: "Take over lesson — investigate regression; add teacher permission to allow takeover (or remove feature)",
        priority: "P0",
        tag: "teach-lessons",
      },
      { name: "Back to lesson button not navigating — fix", priority: "P0", tag: "teach-lessons" },
      {
        name: "Recommended lesson bug — mixed classes incorrectly show same L2 Senior Secondary",
        priority: "P0",
        tag: "teach-lessons",
      },
      { name: "Other lessons list sorted by year level (½, ¾, … 10, 11, 12)", priority: "P1", tag: "teach-lessons" },
      { name: "Only 3 lessons showing (L8, L9, L10) — investigate and fix display", priority: "P1", tag: "teach-lessons" },
      {
        name: "Lessons reset to L1 after completing all 10 — clarify audit log behaviour; confirm data retention",
        priority: "P1",
        tag: "audit",
      },
      {
        name: "Composite classes appear as one class when selecting multiple classes at different levels",
        priority: "P1",
        tag: "teach-lessons",
      },
    ],
  },
  {
    id: "374f7050-80ed-8073-b5eb-dae36d2fa54c",
    name: "Admin Dashboard Redesign",
    start: "2026-06-07",
    end: "2026-06-17",
    status: "Current",
    tasks: [
      {
        name: "Move admin sidebar: Invite School → Manage Schools, Edit Curriculum → Manage Lessons, Edit Certification → Manage AP Cert",
        priority: "P1",
        tag: "admin-sidebar",
      },
      {
        name: "Dashboard summary stats: Total Schools, Active Schools, Ahead, Slightly Behind, Behind",
        priority: "P0",
        tag: "admin-dashboard",
      },
      { name: "Define Active School logic (all onboarding complete + fully unlocked)", priority: "P0", tag: "data" },
      { name: "Schedule status (Ahead / Slightly Behind / Behind) for Active Schools only", priority: "P0", tag: "admin-dashboard" },
      { name: "Progress to End of Term 2 widget (current week, % elapsed); default Qld", priority: "P1", tag: "admin-dashboard" },
      { name: "Dashboard filters: Status, State, Sector, Type — all default All", priority: "P0", tag: "admin-dashboard" },
      {
        name: "Sortable schools table with all columns (School Name, Culture, AP Cert %, Total Students, Total Classes, Lessons Completed Avg %, Schedule, Last Activity, Action)",
        priority: "P0",
        tag: "admin-dashboard",
      },
      {
        name: "School terms by state (Qld, NSW, Vic, SA, WA, Tas, NT, ACT); dashboard scoped to school's state",
        priority: "P0",
        tag: "data",
      },
      { name: "Annual reset of school terms by state each year", priority: "P1", tag: "admin-settings" },
      { name: "Schedule rule — Levels 1–4: by Week N of Term 2, completed N lessons", priority: "P0", tag: "logic" },
      { name: "Schedule rule — Level 5 (Senior): 1 lesson per 2 weeks into Term 2", priority: "P0", tag: "logic" },
      {
        name: "Schedule rule — Year 2+ schools: Primary (Prep, G3, G5) or Secondary (G7, G11) only by end Term 2",
        priority: "P0",
        tag: "logic",
      },
      {
        name: "Schedule calculation: 1 lesson/week (L1–4) or 1 per 2 weeks (L5) by Friday; class average → school status",
        priority: "P0",
        tag: "logic",
      },
      {
        name: "Lessons Completed (Avg %) — calculate required vs completed by school type/year (Primary Y1, Secondary mixed, Y2+ subset)",
        priority: "P0",
        tag: "logic",
      },
      { name: "School Name column → link to Schools/Onboarding page", priority: "P1", tag: "admin-dashboard" },
      { name: "Culture column: ↑ / ↓ / BM / NA indicators; click → Culture Rating page", priority: "P0", tag: "admin-dashboard" },
      { name: "AP Cert % → click → AP Certification detail per staff member", priority: "P1", tag: "admin-dashboard" },
      { name: "Total Classes → click → Class Detail view", priority: "P1", tag: "admin-dashboard" },
      { name: "Lessons Completed (Avg %) → click → Lesson History", priority: "P0", tag: "admin-dashboard" },
      { name: "Last Activity — date of last lesson completed (any class)", priority: "P1", tag: "admin-dashboard" },
      { name: "Action column: phone, email (Outlook), ⋮ menu (export defer unless Reports covers)", priority: "P2", tag: "admin-dashboard" },
    ],
  },
  {
    id: "374f7050-80ed-8095-a53b-f1259f306970",
    name: "Culture Rating",
    start: "2026-06-18",
    end: "2026-06-21",
    status: "Next",
    tasks: [
      {
        name: "Culture Rating data fields: Period, School Days, Attendance, Absences, Minor/Major Incidents, Short/Long Suspensions, Exclusions",
        priority: "P0",
        tag: "culture-rating",
      },
      { name: "Verify formulas match Glenn's 25 Apr email template", priority: "P0", tag: "culture-rating" },
      { name: "Comparative Period rule: must start after Benchmark Period ends", priority: "P0", tag: "culture-rating" },
      { name: "Comparative Period rule: must be done after program completed to all classes", priority: "P0", tag: "culture-rating" },
      { name: "Comparative Period rule: minimum 20 school days per period", priority: "P0", tag: "culture-rating" },
      { name: "Allow overlapping Comparative Periods", priority: "P1", tag: "culture-rating" },
      { name: "Comparative Periods History dropdown — default most recent", priority: "P1", tag: "culture-rating" },
      {
        name: "Dynamic speedometer: ±100% default; expand to 150%/200% when improvement exceeds 100%",
        priority: "P1",
        tag: "culture-rating",
      },
    ],
  },
  {
    id: "374f7050-80ed-8001-bdbd-f53f6c97083a",
    name: "Reports",
    start: "2026-06-22",
    end: "2026-06-23",
    status: "Future",
    tasks: [
      { name: "Fix Reports button on Bullyproof Academy sidebar", priority: "P0", tag: "academy-reports" },
      { name: "AP Certified Staff Report — status + completion date; filter by calendar year", priority: "P1", tag: "school-reports" },
      { name: "AP Teacher Report — classes/lessons per AP Teacher; year selector", priority: "P1", tag: "school-reports" },
      {
        name: "Class Report — 1 to all classes, YTD or previous year; lessons, dates, teacher, rating",
        priority: "P1",
        tag: "school-reports",
      },
      { name: "Culture Rating Report — select Comparative Period, download", priority: "P1", tag: "school-reports" },
    ],
  },
  {
    id: "374f7050-80ed-80cd-a1eb-e0d56abb8bdd",
    name: "Classes & Teachers UX",
    start: "2026-06-24",
    end: "2026-06-25",
    status: "Future",
    tasks: [
      { name: "Add/Edit Class: Student Numbers field (create + edit)", priority: "P0", tag: "school-classes" },
      {
        name: "Classes view: View lessons completed button (lessons, dates, teacher); keep My/Other star toggle",
        priority: "P1",
        tag: "school-classes",
      },
      { name: "Teachers list: compact table (First name, Last name, Status, Email) with sortable columns", priority: "P1", tag: "school-teachers" },
      { name: "Click teacher name → classes taught, lesson number, date, rating", priority: "P1", tag: "school-teachers" },
    ],
  },
  {
    id: "374f7050-80ed-80e7-8eac-f41299fb2c6a",
    name: "Content Types",
    start: "2026-06-26",
    end: "2026-06-27",
    status: "Future",
    tasks: [
      { name: "Admin/Content: Add New button — Content Name, number of levels, level names", priority: "P1", tag: "admin-content" },
      {
        name: "New Content Types under Admin/Content/Content Management — same add/edit as default curriculum",
        priority: "P1",
        tag: "admin-content",
      },
      { name: "Add New School: Content Type dropdown (Default + custom types)", priority: "P1", tag: "admin-schools" },
      { name: "Optional Resources sub-folders per Content Type", priority: "P2", tag: "admin-resources" },
    ],
  },
  {
    id: "374f7050-80ed-80d3-b005-cf00bf07ead5",
    name: "Year Reset / Admin Operations",
    start: "2026-06-28",
    end: "2026-06-29",
    status: "Future",
    tasks: [
      {
        name: "Start new calendar year admin action: reset classes to Lesson 1, archive prior year audit logs",
        priority: "P1",
        tag: "admin-portal",
      },
      { name: "Preserve benchmark data across year reset", priority: "P1", tag: "admin-portal" },
      { name: "Support upload/update of class and staff lists at start of calendar year", priority: "P1", tag: "admin-portal" },
      { name: "Document current year-transition behaviour (discovery spike)", priority: "P2", tag: "docs" },
    ],
  },
  {
    id: "374f7050-80ed-804b-9d85-f76d878bb17d",
    name: "Lesson Feedback",
    start: "2026-06-30",
    end: "2026-06-30",
    status: "Future",
    tasks: [
      { name: 'Add note under star rating: "You must rate this lesson to do another lesson"', priority: "P1", tag: "teach-lessons" },
      {
        name: "Spike / decision: Default rating to 5 stars (Uber-style) vs explicit selection — Glenn sign-off",
        priority: "P2",
        tag: "product",
      },
    ],
  },
];

async function updateSprint(sprint) {
  await notion("PATCH", `/pages/${sprint.id}`, {
    properties: {
      Dates: { date: { start: sprint.start, end: sprint.end } },
      "Sprint status": { status: { name: sprint.status } },
    },
  });
  console.log(`Updated sprint: ${sprint.name} (${sprint.start}..${sprint.end}, ${sprint.status})`);
}

async function countTasks() {
  let total = 0;
  let cursor;
  do {
    const data = await notion("POST", `/databases/${ENGINEERING_TASKS_DB}/query`, {
      page_size: 100,
      start_cursor: cursor,
    });
    total += data.results.length;
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return total;
}

async function createTask(task, sprintId, dueDate) {
  await notion("POST", "/pages", {
    parent: { database_id: ENGINEERING_TASKS_DB },
    properties: {
      "Task name": { title: [{ text: { content: task.name } }] },
      Status: { status: { name: "Not started" } },
      Priority: { select: { name: PRIORITY[task.priority] } },
      Due: { date: { start: dueDate } },
      Sprint: { relation: [{ id: sprintId }] },
      Tags: { multi_select: tagsFor(task.tag).map((name) => ({ name })) },
    },
  });
}

async function main() {
  const expectedTasks = SPRINTS.reduce((n, s) => n + s.tasks.length, 0);
  console.log(`Expected ${expectedTasks} tasks across ${SPRINTS.length} sprints.\n`);

  console.log("Updating sprint dates and statuses...");
  for (const sprint of SPRINTS) {
    await updateSprint(sprint);
  }

  const existing = await countTasks();
  if (existing > 0) {
    console.log(`\nEngineering Tasks already has ${existing} rows — skipping task creation.`);
    return;
  }

  console.log("\nCreating engineering tasks...");
  let created = 0;
  for (const sprint of SPRINTS) {
    for (const task of sprint.tasks) {
      await createTask(task, sprint.id, sprint.end);
      created++;
      if (created % 10 === 0) console.log(`  ${created}/${expectedTasks} tasks created...`);
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  console.log(`\nDone. Created ${created} engineering tasks.`);
}

import { pathToFileURL } from "node:url";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
