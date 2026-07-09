import { db } from "@/server/db/drizzle";
import {
  contentTypes,
  curriculumStages,
  topics,
  topicSlides,
  resourceFileTopics,
  schools,
} from "@/server/db/schema";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";

/** Either the root db handle or an open transaction; both share the query API. */
type Db = typeof db;
type Executor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

/** Turn ordered level names into unique, per-type stage rows (S1..Sn). */
function buildStageRows(contentTypeId: string, levelNames: string[]) {
  const usedSlugs = new Set<string>();
  return levelNames.map((name, i) => {
    const base = slugify(name) || `level-${i + 1}`;
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${n++}`;
    }
    usedSlugs.add(slug);
    return {
      contentTypeId,
      code: `S${i + 1}`,
      name,
      slug,
      sortIndex: i + 1,
    };
  });
}

export const contentTypesRepo = {
  async list() {
    return db
      .select()
      .from(contentTypes)
      .orderBy(sql`${contentTypes.isDefault} DESC`, asc(contentTypes.name));
  },

  async getById(id: string) {
    const [row] = await db
      .select()
      .from(contentTypes)
      .where(eq(contentTypes.id, id))
      .limit(1);
    return row ?? null;
  },

  async getDefault() {
    const [row] = await db
      .select()
      .from(contentTypes)
      .where(eq(contentTypes.isDefault, true))
      .limit(1);
    return row ?? null;
  },

  /** Default content-type id, resolved once. Throws if the seed is missing. */
  async getDefaultId(): Promise<string> {
    const row = await this.getDefault();
    if (!row) {
      throw new Error("No default content type is configured");
    }
    return row.id;
  },

  /** Case-insensitive name match, optionally excluding one row (for renames). */
  async findByNameInsensitive(name: string, excludeId?: string) {
    const nameMatch = sql`lower(${contentTypes.name}) = lower(${name})`;
    const where = excludeId
      ? and(nameMatch, ne(contentTypes.id, excludeId))
      : nameMatch;
    const [row] = await db
      .select({ id: contentTypes.id })
      .from(contentTypes)
      .where(where)
      .limit(1);
    return row ?? null;
  },

  /** Insert the content_type row and materialise one stage per level, atomically. */
  async insertWithLevels(
    exec: Executor,
    data: { name: string; levelNames: string[] },
  ) {
    const [type] = await exec
      .insert(contentTypes)
      .values({
        name: data.name,
        levelCount: data.levelNames.length,
        levelNames: data.levelNames,
      })
      .returning();

    const stageRows = buildStageRows(type.id, data.levelNames);
    if (stageRows.length > 0) {
      await exec.insert(curriculumStages).values(stageRows);
    }
    return type;
  },

  async update(
    id: string,
    data: { name?: string; levelNames?: string[]; levelCount?: number },
  ) {
    const [row] = await db
      .update(contentTypes)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.levelNames !== undefined
          ? { levelNames: data.levelNames, levelCount: data.levelNames.length }
          : {}),
        updatedAt: sql`now()`,
      })
      .where(eq(contentTypes.id, id))
      .returning();
    return row ?? null;
  },

  async delete(id: string) {
    await db.delete(contentTypes).where(eq(contentTypes.id, id));
  },

  // --- delete guards -------------------------------------------------------

  async countSchoolsUsing(id: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schools)
      .where(eq(schools.contentTypeId, id));
    return row?.n ?? 0;
  },

  /** True when any stage of this type already has at least one topic. */
  async hasTopics(id: string): Promise<boolean> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(topics)
      .innerJoin(curriculumStages, eq(topics.stageId, curriculumStages.id))
      .where(eq(curriculumStages.contentTypeId, id));
    return (row?.n ?? 0) > 0;
  },

  // --- stage helpers for edit sync ----------------------------------------

  async listStages(contentTypeId: string) {
    return db
      .select()
      .from(curriculumStages)
      .where(eq(curriculumStages.contentTypeId, contentTypeId))
      .orderBy(asc(curriculumStages.sortIndex));
  },

  async stageHasTopics(stageId: string): Promise<boolean> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(topics)
      .where(eq(topics.stageId, stageId));
    return (row?.n ?? 0) > 0;
  },

  async renameStage(stageId: string, name: string) {
    await db
      .update(curriculumStages)
      .set({ name, updatedAt: sql`now()` })
      .where(eq(curriculumStages.id, stageId));
  },

  async deleteStages(stageIds: string[]) {
    if (stageIds.length === 0) return;
    await db
      .delete(curriculumStages)
      .where(inArray(curriculumStages.id, stageIds));
  },

  /** Append new levels as stages continuing the S{n} ladder from startIndex. */
  async appendStages(
    contentTypeId: string,
    startIndex: number,
    levelNames: string[],
  ) {
    if (levelNames.length === 0) return;
    const existing = await db
      .select({ slug: curriculumStages.slug })
      .from(curriculumStages)
      .where(eq(curriculumStages.contentTypeId, contentTypeId));
    const used = new Set(existing.map((r) => r.slug));
    const rows = levelNames.map((name, i) => {
      const idx = startIndex + i;
      const base = slugify(name) || `level-${idx + 1}`;
      let slug = base;
      let n = 2;
      while (used.has(slug)) slug = `${base}-${n++}`;
      used.add(slug);
      return {
        contentTypeId,
        code: `S${idx + 1}`,
        name,
        slug,
        sortIndex: idx + 1,
      };
    });
    await db.insert(curriculumStages).values(rows);
  },

  // --- duplicate-from-template --------------------------------------------

  /**
   * Deep-copy a whole content type: the type row, its stages, each stage's
   * topics, each topic's slides, and the resource_file_topics links. Runs in one
   * transaction; a failure anywhere leaves no partial type behind. The source is
   * never mutated.
   */
  async duplicateFromSource(
    newName: string,
    sourceId: string,
  ): Promise<{ id: string } | null> {
    return db.transaction(async (tx) => {
      const [source] = await tx
        .select()
        .from(contentTypes)
        .where(eq(contentTypes.id, sourceId))
        .limit(1);
      if (!source) return null;

      const [type] = await tx
        .insert(contentTypes)
        .values({
          name: newName,
          levelCount: source.levelCount,
          levelNames: source.levelNames,
        })
        .returning();

      const sourceStages = await tx
        .select()
        .from(curriculumStages)
        .where(eq(curriculumStages.contentTypeId, sourceId))
        .orderBy(asc(curriculumStages.sortIndex));

      for (const stage of sourceStages) {
        const [newStage] = await tx
          .insert(curriculumStages)
          .values({
            contentTypeId: type.id,
            code: stage.code,
            name: stage.name,
            slug: stage.slug,
            sortIndex: stage.sortIndex,
          })
          .returning();

        const sourceTopics = await tx
          .select()
          .from(topics)
          .where(eq(topics.stageId, stage.id));

        for (const topic of sourceTopics) {
          const [newTopic] = await tx
            .insert(topics)
            .values({
              stageId: newStage.id,
              title: topic.title,
              status: topic.status,
              officialNotes: topic.officialNotes,
              stageOrder: topic.stageOrder,
            })
            .returning();

          const sourceSlides = await tx
            .select()
            .from(topicSlides)
            .where(eq(topicSlides.topicId, topic.id));

          for (const slide of sourceSlides) {
            const [newSlide] = await tx
              .insert(topicSlides)
              .values({
                topicId: newTopic.id,
                kind: slide.kind,
                textHtml: slide.textHtml,
                imageUrl: slide.imageUrl,
                videoUrl: slide.videoUrl,
                videoStartS: slide.videoStartS,
                videoEndS: slide.videoEndS,
                officialNotes: slide.officialNotes,
                durationSec: slide.durationSec,
                position: slide.position,
              })
              .returning();
            void newSlide;
          }

          // Re-point resource links at the cloned topic.
          const links = await tx
            .select()
            .from(resourceFileTopics)
            .where(eq(resourceFileTopics.topicId, topic.id));
          if (links.length > 0) {
            await tx.insert(resourceFileTopics).values(
              links.map((l) => ({
                fileId: l.fileId,
                topicId: newTopic.id,
                createdBy: l.createdBy,
              })),
            );
          }
        }
      }

      return { id: type.id };
    });
  },
};
