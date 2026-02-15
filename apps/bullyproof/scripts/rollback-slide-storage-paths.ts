/**
 * Rollback script: restore topic_slides.image_url from migration backup
 *
 * Usage: pnpm exec tsx scripts/rollback-slide-storage-paths.ts <backup-file.json>
 *
 * Example: pnpm exec tsx scripts/rollback-slide-storage-paths.ts storage-path-migration-backup-1234567890.json
 */

import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "..", ".env.local") });
config({ path: join(__dirname, "..", ".env") });

import { readFileSync } from "fs";
import { db } from "../server/db/drizzle";
import { topicSlides } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function rollback() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error("Usage: tsx scripts/rollback-slide-storage-paths.ts <backup-file.json>");
    process.exit(1);
  }

  let backup: Record<string, string>;
  try {
    backup = JSON.parse(readFileSync(backupPath, "utf-8"));
  } catch (e: any) {
    console.error("Failed to read backup:", e?.message);
    process.exit(1);
  }

  console.log(`Rolling back ${Object.keys(backup).length} slides from ${backupPath}\n`);

  let ok = 0;
  for (const [slideId, imageUrl] of Object.entries(backup)) {
    await db
      .update(topicSlides)
      .set({
        imageUrl,
        signedUrl: null,
      })
      .where(eq(topicSlides.id, slideId));
    ok++;
  }

  console.log(`Restored image_url for ${ok} slides.`);
  console.log("Note: New path files in storage are left as-is (not deleted).");
}

rollback()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
