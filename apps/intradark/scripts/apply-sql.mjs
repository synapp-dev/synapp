// Apply a raw .sql migration file atomically against DATABASE_URL (.env.local).
// Usage: node scripts/apply-sql.mjs drizzle/0043_tournaments.sql
import postgres from "postgres";
import { config } from "dotenv";
import { readFileSync } from "node:fs";

config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-sql.mjs <path-to-sql>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const raw = readFileSync(file, "utf8");
// drizzle breakpoints are SQL comments, harmless, but strip for cleanliness.
const body = raw.replaceAll("--> statement-breakpoint", "");

const sql = postgres(url, { prepare: false, max: 1 });

try {
  await sql.unsafe("BEGIN");
  await sql.unsafe(body);
  await sql.unsafe("COMMIT");
  console.log(`✓ applied ${file}`);
} catch (err) {
  try {
    await sql.unsafe("ROLLBACK");
  } catch {}
  console.error(`✗ failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
