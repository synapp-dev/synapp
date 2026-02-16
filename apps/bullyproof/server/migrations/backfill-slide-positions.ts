/**
 * Normalize slide positions for topic_slides and course_topic_slides.
 * Recomputes fractional positions based on current order (useful if positions
 * get out of sync). No-op if order_index no longer exists (migration already ran).
 *
 * Used by both the CLI script and the admin API.
 */

import { db } from "@/server/db/drizzle";
import { topicSlides, courseTopicSlides } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { computePositionsForOrder } from "@/server/lib/fractional-position";

type SlideRow = { id: string; topicId: string };

async function normalizeTable(
  tableName: string,
  table: typeof topicSlides | typeof courseTopicSlides
): Promise<{ updated: number; topics: number }> {
  const rows = await db
    .select({
      id: table.id,
      topicId: table.topicId,
    })
    .from(table)
    .orderBy(asc(table.topicId), asc(table.position));

  if (rows.length === 0) {
    return { updated: 0, topics: 0 };
  }

  const byTopic = new Map<string, SlideRow[]>();
  for (const row of rows) {
    const key = String(row.topicId);
    const arr = byTopic.get(key) ?? [];
    arr.push(row);
    byTopic.set(key, arr);
  }

  let updated = 0;
  for (const slides of byTopic.values()) {
    const slideIds = slides.map((s) => s.id);
    const positions = computePositionsForOrder(slideIds);

    for (let i = 0; i < slideIds.length; i++) {
      await db
        .update(table)
        .set({ position: positions[i] })
        .where(eq(table.id, slideIds[i]));
      updated++;
    }
  }

  return { updated, topics: byTopic.size };
}

export interface BackfillSlidePositionsResult {
  topicSlides: { updated: number; topics: number };
  courseTopicSlides: { updated: number; topics: number };
  total: number;
}

export async function runBackfillSlidePositions(): Promise<BackfillSlidePositionsResult> {
  const topicSlidesResult = await normalizeTable("topic_slides", topicSlides);
  const courseTopicSlidesResult = await normalizeTable(
    "course_topic_slides",
    courseTopicSlides
  );

  return {
    topicSlides: topicSlidesResult,
    courseTopicSlides: courseTopicSlidesResult,
    total: topicSlidesResult.updated + courseTopicSlidesResult.updated,
  };
}
