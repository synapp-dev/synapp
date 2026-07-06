import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import {
  courseTopicSlides,
  topicSlides,
} from "@/server/db/schema";
import { courseTopicSlidesRepo } from "../course-topic-slides/course-topic-slides.repo";
import { topicSlidesRepo } from "../topic-slides/topic-slides.repo";
import { findSlidesNotOwnedByTopic } from "@/lib/slide-editing";

export type SlideEditingReorderDeps = {
  getValidSlideIds: (
    topicId: string,
    slideIds: string[]
  ) => Promise<Set<string>>;
  applyOrder: (topicId: string, slideIds: string[]) => Promise<void>;
  normalizeOrder: (topicId: string) => Promise<void>;
};

export type ApplySlideReorderResult =
  | { ok: true }
  | { ok: false; invalidSlideIds: string[] };

export async function applySlideReorder(
  topicId: string,
  finalOrder: string[],
  deps: SlideEditingReorderDeps
): Promise<ApplySlideReorderResult> {
  const validIds = await deps.getValidSlideIds(topicId, finalOrder);
  const invalidSlideIds = findSlidesNotOwnedByTopic(finalOrder, validIds);

  if (invalidSlideIds.length > 0) {
    return { ok: false, invalidSlideIds };
  }

  await deps.applyOrder(topicId, finalOrder);
  return { ok: true };
}

export async function applySlideReorderOrNormalize(
  topicId: string,
  finalOrder: string[] | null,
  deps: SlideEditingReorderDeps
): Promise<ApplySlideReorderResult> {
  if (finalOrder && finalOrder.length > 0) {
    return applySlideReorder(topicId, finalOrder, deps);
  }

  await deps.normalizeOrder(topicId);
  return { ok: true };
}

export function createCurriculumSlideEditingDeps(): SlideEditingReorderDeps {
  return {
    getValidSlideIds: async (topicId, slideIds) => {
      if (slideIds.length === 0) return new Set();
      const rows = await db
        .select({ id: topicSlides.id })
        .from(topicSlides)
        .where(
          and(
            eq(topicSlides.topicId, topicId),
            inArray(topicSlides.id, slideIds)
          )
        );
      return new Set(rows.map((row) => row.id));
    },
    applyOrder: (topicId, slideIds) =>
      topicSlidesRepo.bulkUpdateOrder(topicId, slideIds).then(() => undefined),
    normalizeOrder: (topicId) =>
      topicSlidesRepo.normalizeSlideOrder(topicId).then(() => undefined),
  };
}

export function createCertificationSlideEditingDeps(): SlideEditingReorderDeps {
  return {
    getValidSlideIds: async (topicId, slideIds) => {
      if (slideIds.length === 0) return new Set();
      const rows = await db
        .select({ id: courseTopicSlides.id })
        .from(courseTopicSlides)
        .where(
          and(
            eq(courseTopicSlides.topicId, topicId),
            inArray(courseTopicSlides.id, slideIds)
          )
        );
      return new Set(rows.map((row) => row.id));
    },
    applyOrder: (topicId, slideIds) =>
      courseTopicSlidesRepo
        .bulkUpdateOrder(topicId, slideIds)
        .then(() => undefined),
    normalizeOrder: (topicId) =>
      courseTopicSlidesRepo.normalizeSlideOrder(topicId).then(() => undefined),
  };
}
