import { db } from "@/server/db/drizzle";
import { schoolInvites, schools, userProfile } from "@/server/db/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

export const invitesRepo = {
  getAll: () => db.select().from(schoolInvites),

  getById: (id: string) =>
    db.select().from(schoolInvites).where(eq(schoolInvites.id, id)).limit(1),

  getBySchoolId: (schoolId: string) =>
    db
      .select()
      .from(schoolInvites)
      .where(eq(schoolInvites.schoolId, schoolId))
      .orderBy(desc(schoolInvites.createdAt)),

  getByEmail: (email: string) =>
    db
      .select()
      .from(schoolInvites)
      .where(eq(schoolInvites.email, email))
      .orderBy(desc(schoolInvites.createdAt)),

  getWithDetails: async (id: string) => {
    const inviteData = await db
      .select({
        invite: schoolInvites,
        school: schools,
      })
      .from(schoolInvites)
      .leftJoin(schools, eq(schoolInvites.schoolId, schools.id))
      .where(eq(schoolInvites.id, id))
      .limit(1);

    if (inviteData.length === 0) return null;

    return {
      ...inviteData[0].invite,
      school: inviteData[0].school,
    };
  },

  create: (data: {
    schoolId: string;
    email: string;
    roleKey: string;
    invitedByUserId: string;
    expiresAt?: string;
    metadata?: Record<string, any>;
  }) =>
    db
      .insert(schoolInvites)
      .values({ ...data, token: randomUUID() } as any)
      .returning(),

  update: (
    id: string,
    data: {
      status?: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
      expiresAt?: string;
      metadata?: Record<string, any>;
    }
  ) =>
    db
      .update(schoolInvites)
      .set(data)
      .where(eq(schoolInvites.id, id))
      .returning(),

  delete: (id: string) =>
    db.delete(schoolInvites).where(eq(schoolInvites.id, id)),

  getPendingByEmail: (email: string) =>
    db
      .select()
      .from(schoolInvites)
      .where(
        and(eq(schoolInvites.email, email), eq(schoolInvites.status, "PENDING"))
      )
      .orderBy(desc(schoolInvites.createdAt)),
};
