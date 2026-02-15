/**
 * Invokes the migrate-slide-storage-paths Edge Function via HTTP.
 * Uses SUPABASE_ADMIN_KEY for Authorization. No local DB connection needed.
 *
 * Run: pnpm migrate:slide-paths-remote
 */

import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "..", ".env.local") });
config({ path: join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ADMIN_KEY = process.env.SUPABASE_ADMIN_KEY;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ADMIN_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ADMIN_KEY in .env.local");
    process.exit(1);
  }

  // Edge Functions live at the project host - use standard Supabase URL if custom domain
  const fnUrl = SUPABASE_URL.includes("supabase.co")
    ? `${SUPABASE_URL}/functions/v1/migrate-slide-storage-paths`
    : `https://sukurbtgprvxgoeagich.supabase.co/functions/v1/migrate-slide-storage-paths`;

  console.log("Invoking migrate-slide-storage-paths Edge Function...");
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ADMIN_KEY}`,
    },
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Response:", text);
    process.exit(1);
  }

  if (!res.ok) {
    console.error("Error:", json);
    process.exit(1);
  }

  console.log("Result:", json);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
