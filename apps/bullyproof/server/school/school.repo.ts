import { db } from "@/server/db/drizzle";
import { schools } from "@/server/db/schema";
import { asc, eq, ilike, inArray } from "drizzle-orm";

export const schoolRepo = {
  getAll: () => db.select().from(schools),

  getAllPaginated: async (params: {
    limit: number;
    offset: number;
    search?: string;
  }) => {
    const where = params.search
      ? ilike(schools.name, `%${params.search}%`)
      : undefined;

    const rows = await db
      .select()
      .from(schools)
      .where(where as any)
      .orderBy(asc(schools.name))
      .limit(params.limit)
      .offset(params.offset);

    // Optionally return total count if needed later
    return rows;
  },

  getByIds: (ids: string[]) =>
    db.select().from(schools).where(inArray(schools.id, ids)),

  getBySlug: (slug: string) =>
    db.select().from(schools).where(eq(schools.slug, slug)).limit(1),

  // Example: join table lookups can live here too (e.g., teacher_school_assignments)
  // getByTeacher: (teacherId: string) => db.select()...join(...).where(...)
};
