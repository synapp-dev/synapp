import { db } from "@/server/db/drizzle";
import { states } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";

export const statesRepo = {
  getAll: () => 
    db
      .select()
      .from(states)
      .orderBy(asc(states.name)),

  getById: (id: string) =>
    db
      .select()
      .from(states)
      .where(eq(states.id, id))
      .limit(1),

  getByCode: (code: string) =>
    db
      .select()
      .from(states)
      .where(eq(states.code, code))
      .limit(1),
};
