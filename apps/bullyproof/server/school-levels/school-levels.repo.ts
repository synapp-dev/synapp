import { db } from "@/server/db/drizzle";
import { schoolLevels } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";

export const schoolLevelsRepo = {
  getAll: () => 
    db
      .select()
      .from(schoolLevels)
      .orderBy(asc(schoolLevels.key)),

  getById: (id: string) =>
    db
      .select()
      .from(schoolLevels)
      .where(eq(schoolLevels.id, id))
      .limit(1),

  getByKey: (key: string) =>
    db
      .select()
      .from(schoolLevels)
      .where(eq(schoolLevels.key, key))
      .limit(1),
};
