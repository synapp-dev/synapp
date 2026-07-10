/**
 * Seed / verify content types (module M1).
 *
 * The Default type is created by migration 0029 (backfilled from the existing
 * curriculum). This script is idempotent: it verifies Default exists and can
 * register the client's own types by name + level names once confirmed.
 *
 * Usage:
 *   pnpm tsx scripts/seed-content-types.ts            # verify Default only
 *   SEED_THURSDAY_ISLAND=1 pnpm tsx scripts/seed-content-types.ts
 *
 * Thursday Island's real level names are an open question with the client; the
 * placeholder below must be replaced with Glenn's confirmed data before use.
 */
import { db } from "../server/db/drizzle";
import { contentTypesRepo } from "../server/content-types/content-types.repo";

async function ensureType(name: string, levelNames: string[]) {
  const existing = await contentTypesRepo.findByNameInsensitive(name);
  if (existing) {
    console.log(`• "${name}" already exists (${existing.id}) - skipping`);
    return;
  }
  const created = await db.transaction((tx) =>
    contentTypesRepo.insertWithLevels(tx, { name, levelNames }),
  );
  console.log(
    `✓ created "${name}" (${created.id}) with ${levelNames.length} levels`,
  );
}

async function main() {
  const def = await contentTypesRepo.getDefault();
  if (!def) {
    throw new Error(
      "No Default content type found. Apply migration 0029 before seeding.",
    );
  }
  console.log(
    `✓ Default type present (${def.id}) with ${def.levelCount} levels`,
  );

  if (process.env.SEED_THURSDAY_ISLAND === "1") {
    // TODO(client): replace with Glenn's confirmed level names.
    await ensureType("Thursday Island", ["Level 1", "Level 2", "Level 3"]);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
