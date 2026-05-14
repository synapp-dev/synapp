/**
 * Replace published Mirage utility lineups from misc/miragesmoke.json.
 *
 * Prerequisites: DATABASE_URL, migration `0010_utility_lineups_coordinates` applied,
 * `maps.slug = 'de_mirage'` row present.
 *
 * Run from apps/intradark:
 *   dotenv -e .env.local -- pnpm run seed:mirage-lineups
 */

import "dotenv/config";
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

  const jsonPath = join(__dirname, "../misc/miragesmoke.json");
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as MirageSmokeJsonRow[];

  const mapRows = await db
    .select({ id: maps.id })
    .from(maps)
    .where(eq(maps.slug, "de_mirage"))
    .limit(1);

  const map = mapRows[0];
  if (!map) {
    console.error('No maps row with slug "de_mirage". Seed maps first.');
    process.exit(1);
  }

  const inserts = raw.map((row) => mirageSmokeRowToLineupInsert(map.id, row));

  await db.transaction(async (tx) => {
    await tx.delete(utilityLineups).where(eq(utilityLineups.mapId, map.id));
    await tx.insert(utilityLineups).values(inserts);
  });

  console.log(
    `Seeded ${inserts.length} Mirage smoke lineups (replaced all rows for map ${map.id}).`,
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
