/**
 * Migration script: s{N}/t{N} -> {stageId}/{topicId} storage paths
 *
 * Copies existing topic slide images from old numeric paths to new ID-based paths.
 * Uses COPY (keeps originals) for safe rollback. Updates topic_slides.image_url.
 *
 * Prerequisites:
 * - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ADMIN_KEY in .env.local
 *
 * Run: pnpm migrate:slide-paths (from any directory)
 */

import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from package root (apps/bullyproof), not cwd
config({ path: join(__dirname, "..", ".env.local") });
config({ path: join(__dirname, "..", ".env") });
import { createClient } from "@supabase/supabase-js";
import { db } from "../server/db/drizzle";
import { topicSlides, topics } from "../drizzle/schema";
import { eq, isNotNull } from "drizzle-orm";
import { getTopicSlideStoragePath } from "../lib/slide-storage-path";
import { writeFileSync } from "fs";

const OLD_PATH_REGEX = /slides\/topics\/s\d+\/t\d+\/([^.]+\.\w+)$/;
const FULL_URL_PATTERN =
  /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;

function extractStoragePath(imageUrl: string): string | null {
  if (!imageUrl?.trim()) return null;
  const urlMatch = imageUrl.match(FULL_URL_PATTERN);
  const path = urlMatch ? urlMatch[1] : imageUrl.trim();
  if (!path.startsWith("slides/topics/")) return null;
  const oldMatch = path.match(OLD_PATH_REGEX);
  return oldMatch ? path : null;
}

async function migrate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ADMIN_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ADMIN_KEY (use .env.local)"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log("Migrating topic slide storage paths: s{N}/t{N} -> {stageId}/{topicId}\n");

  const rows = await db
    .select({
      slideId: topicSlides.id,
      topicId: topicSlides.topicId,
      imageUrl: topicSlides.imageUrl,
      stageId: topics.stageId,
    })
    .from(topicSlides)
    .innerJoin(topics, eq(topicSlides.topicId, topics.id))
    .where(isNotNull(topicSlides.imageUrl));

  const toMigrate = rows.filter((r) => {
    const path = extractStoragePath(r.imageUrl!);
    return path !== null;
  });

  console.log(`Found ${toMigrate.length} slides with old path format (of ${rows.length} with image_url)\n`);

  if (toMigrate.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  const backup: Record<string, string> = {};
  let ok = 0;
  let err = 0;

  for (const row of toMigrate) {
    const oldPath = extractStoragePath(row.imageUrl!);
    if (!oldPath || !row.stageId) continue;

    const ext = oldPath.split(".").pop() || "jpg";
    const newPath = getTopicSlideStoragePath(
      row.stageId,
      row.topicId,
      row.slideId,
      ext
    );

    try {
      const { error } = await supabase.storage
        .from("content")
        .copy(oldPath, newPath);

      if (error) {
        console.error(`Copy failed ${row.slideId}: ${error.message}`);
        err++;
        continue;
      }

      await db
        .update(topicSlides)
        .set({
          imageUrl: newPath,
          signedUrl: null,
        })
        .where(eq(topicSlides.id, row.slideId));

      backup[row.slideId] = row.imageUrl!;
      ok++;
      if (ok % 20 === 0) console.log(`  Migrated ${ok}...`);
    } catch (e: any) {
      console.error(`Error ${row.slideId}:`, e?.message);
      err++;
    }
  }

  const backupPath = join(
    process.cwd(),
    `storage-path-migration-backup-${Date.now()}.json`
  );
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written to: ${backupPath}`);
  console.log(`Done: ${ok} migrated, ${err} errors`);
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
