import { db } from "@/server/db/drizzle";
import { schoolSectors } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";

export const schoolSectorsRepo = {
  getAll: () => 
    db
      .select()
      .from(schoolSectors)
      .orderBy(asc(schoolSectors.key)),

  getById: (id: string) =>
    db
      .select()
      .from(schoolSectors)
      .where(eq(schoolSectors.id, id))
      .limit(1),

  getByKey: (key: string) =>
    db
      .select()
      .from(schoolSectors)
      .where(eq(schoolSectors.key, key))
      .limit(1),
};
