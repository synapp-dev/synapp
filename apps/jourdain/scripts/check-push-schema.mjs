// Read-only: report whether the push/reminders schema objects exist.
// Run from the jourdain app dir: node scripts/check-push-schema.mjs
/* global process */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

let databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
      if (m) {
        databaseUrl = m[1].trim().replace(/^["']|["']$/g, "");
        break;
      }
    }
  }
}
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const require = createRequire(path.join(process.cwd(), "package.json"));
const postgres = require("postgres");
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('push_subscriptions','notification_settings','tasks','people','google_connections')
    ORDER BY table_name`;
  const taskCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks'
      AND column_name IN ('remind_at','reminded_at')
    ORDER BY column_name`;

  const present = new Set(tables.map((r) => r.table_name));
  const cols = new Set(taskCols.map((r) => r.column_name));
  const check = (ok, label) => console.log(`${ok ? "✅" : "❌ MISSING"}  ${label}`);

  console.log("— push/reminders schema —");
  check(present.has("push_subscriptions"), "table push_subscriptions");
  check(present.has("notification_settings"), "table notification_settings");
  check(cols.has("remind_at"), "tasks.remind_at");
  check(cols.has("reminded_at"), "tasks.reminded_at");
  console.log("— foundation (should already exist) —");
  check(present.has("tasks"), "table tasks");
  check(present.has("people"), "table people");
  check(present.has("google_connections"), "table google_connections");
} finally {
  await sql.end();
}
