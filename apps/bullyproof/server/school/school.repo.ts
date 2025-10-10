import { db } from "@/server/db/drizzle";
import { vSchoolsReadable } from "@/server/db/schema";
import { asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";

export const schoolRepo = {
  getAll: () => db.select().from(vSchoolsReadable),

  getAllPaginated: async (params: {
    limit: number;
    offset: number;
    search?: string;
  }) => {
    const hasSearch =
      typeof params.search === "string" && params.search.trim().length > 0;

    if (!hasSearch) {
      const rows = await db
        .select()
        .from(vSchoolsReadable)
        .orderBy(asc(vSchoolsReadable.name))
        .limit(params.limit)
        .offset(params.offset);
      return rows;
    }

    const q = params.search!.trim();

    // Try to use pg_trgm similarity() for fuzzy ranking if available.
    // Falls back to ILIKE and alphabetical order if similarity not installed.
    try {
      const similarityExpr = sql`similarity(${vSchoolsReadable.name}, ${q})`;
      const rows = await db
        .select()
        .from(vSchoolsReadable)
        .where(ilike(vSchoolsReadable.name, `%${q}%`) as any)
        .orderBy(desc(similarityExpr), asc(vSchoolsReadable.name))
        .limit(params.limit)
        .offset(params.offset);
      return rows;
    } catch {
      const rows = await db
        .select()
        .from(vSchoolsReadable)
        .where(ilike(vSchoolsReadable.name, `%${q}%`) as any)
        .orderBy(asc(vSchoolsReadable.name))
        .limit(params.limit)
        .offset(params.offset);
      return rows;
    }
  },

  getByIds: (ids: string[]) =>
    db.select().from(vSchoolsReadable).where(inArray(vSchoolsReadable.id, ids)),

  getBySlug: (slug: string) =>
    db
      .select()
      .from(vSchoolsReadable)
      .where(eq(vSchoolsReadable.slug, slug))
      .limit(1),

  // Example: join table lookups can live here too (e.g., teacher_school_assignments)
  // getByTeacher: (teacherId: string) => db.select()...join(...).where(...)
};
