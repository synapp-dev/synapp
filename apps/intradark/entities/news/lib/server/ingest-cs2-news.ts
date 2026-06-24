import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { allocateUniqueUrlSlug } from "@/entities/content/lib/slug";
import { isNewsSlugTaken } from "@/entities/news/lib/queries";
import { slugifyTitle, validateSlug } from "@/entities/news/lib/slug";
import { db } from "@/server/db/drizzle";
import {
  newsArticleTags,
  newsArticles,
  newsTags,
} from "@/server/db/schema";

import { fetchCs2NewsItems } from "./cs2-updates-source";
import { bbcodeToExcerpt, extractFirstImageUrl } from "./steam-bbcode";
import { steamBbcodeToTiptapDoc } from "./steam-content";

const SOURCE = "steam_cs2";

export type IngestSummary = {
  fetched: number;
  created: number;
  skipped: number;
  errors: { gid: string; message: string }[];
};

/**
 * Pulls the latest CS2 news, creates a DRAFT article for each new item
 * (deduped by Steam gid), auto-tags it, and sets the cover from the first image.
 * Everything lands in the /news/admin approval queue. Writes go through the
 * Drizzle (owner) connection, so the dedicated bot author is required only to
 * satisfy the `author_user_id` FK.
 */
export async function ingestCs2News(opts?: {
  count?: number;
}): Promise<IngestSummary> {
  const botUserId = process.env.NEWS_BOT_USER_ID;
  if (!botUserId) {
    throw new Error(
      "NEWS_BOT_USER_ID is not set. Run `pnpm seed:news-bot` and set the printed id in your env.",
    );
  }

  const items = await fetchCs2NewsItems(opts?.count ?? 15);
  const summary: IngestSummary = {
    fetched: items.length,
    created: 0,
    skipped: 0,
    errors: [],
  };
  if (items.length === 0) return summary;

  // Dedupe: which gids already exist for this source.
  const gids = items.map((i) => i.gid);
  const existing = await db
    .select({ externalId: newsArticles.externalId })
    .from(newsArticles)
    .where(
      and(eq(newsArticles.source, SOURCE), inArray(newsArticles.externalId, gids)),
    );
  const seen = new Set(existing.map((r) => r.externalId));

  // Tag slug -> id.
  const tagRows = await db
    .select({ id: newsTags.id, slug: newsTags.slug })
    .from(newsTags);
  const tagIdBySlug = new Map(tagRows.map((t) => [t.slug, t.id]));

  for (const item of items) {
    if (seen.has(item.gid)) {
      summary.skipped++;
      continue;
    }
    try {
      const slug = await allocateUniqueUrlSlug({
        preferred: slugifyTitle(item.title),
        slugify: slugifyTitle,
        validate: validateSlug,
        isTaken: isNewsSlugTaken,
      });
      const now = new Date().toISOString();

      const [row] = await db
        .insert(newsArticles)
        .values({
          title: item.title.slice(0, 500),
          slug,
          excerpt: bbcodeToExcerpt(item.contents) || null,
          coverImageUrl: extractFirstImageUrl(item.contents),
          source: SOURCE,
          externalId: item.gid,
          bodyJson: steamBbcodeToTiptapDoc(item.contents),
          status: "draft",
          publishedAt: null,
          authorUserId: botUserId,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: newsArticles.id });

      if (!row) {
        summary.errors.push({ gid: item.gid, message: "insert returned no row" });
        continue;
      }

      const tagId = tagIdBySlug.get(item.tagSlug);
      if (tagId) {
        await db
          .insert(newsArticleTags)
          .values({ articleId: row.id, tagId })
          .onConflictDoNothing();
      }

      summary.created++;
    } catch (err) {
      summary.errors.push({
        gid: item.gid,
        message: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  if (summary.created > 0) {
    try {
      revalidatePath("/news");
      revalidatePath("/news/admin");
    } catch {
      // revalidatePath requires a request context; ignore if absent.
    }
  }
  return summary;
}
