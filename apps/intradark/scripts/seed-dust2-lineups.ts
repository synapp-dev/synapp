/**
 * Replace published Dust 2 utility lineups from misc/dust2smoke.json.
 *
 * Prerequisites: DATABASE_URL, `maps.slug = 'de_dust2'` row present.
 *
 * Run from apps/intradark:
 *   dotenv -e .env.local -- pnpm run seed:dust2-lineups
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

import {
  mirageSmokeRowToLineupInsert,
  type MirageSmokeJsonRow,
} from "@/entities/utility-lineups/lib/miragesmoke-lineup-map";
import { client, db } from "@/server/db/drizzle";
import { maps, utilityLineups } from "@/server/db/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const jsonPath = join(__dirname, "../misc/dust2smoke.json");
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as MirageSmokeJsonRow[];

  const mapRows = await db
    .select({ id: maps.id })
    .from(maps)
    .where(eq(maps.slug, "de_dust2"))
    .limit(1);

  const map = mapRows[0];
  if (!map) {
    console.error('No maps row with slug "de_dust2". Seed maps first.');
    process.exit(1);
  }

  const inserts = raw.map((row) => mirageSmokeRowToLineupInsert(map.id, row));

  await db.transaction(async (tx) => {
    await tx.delete(utilityLineups).where(eq(utilityLineups.mapId, map.id));
    await tx.insert(utilityLineups).values(inserts);
  });

  console.log(
    `Seeded ${inserts.length} Dust 2 smoke lineups (replaced all rows for map ${map.id}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
