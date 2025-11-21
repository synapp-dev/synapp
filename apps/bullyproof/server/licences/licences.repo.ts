import { db } from "@/server/db/drizzle";
import { schoolLicences, schools, userProfile } from "@/server/db/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";

export const licencesRepo = {
  getAll: () => db.select().from(schoolLicences),

  getById: (id: string) =>
    db.select().from(schoolLicences).where(eq(schoolLicences.id, id)).limit(1),

  getBySchoolId: (schoolId: string) =>
    db
      .select()
      .from(schoolLicences)
      .where(eq(schoolLicences.schoolId, schoolId))
      .orderBy(desc(schoolLicences.createdAt)),

  getWithDetails: async (id: string) => {
    const licenceData = await db
      .select({
        licence: schoolLicences,
        school: schools,
        createdBy: {
          id: userProfile.id,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          email: userProfile.email,
        },
      })
      .from(schoolLicences)
      .leftJoin(schools, eq(schoolLicences.schoolId, schools.id))
      .leftJoin(userProfile, eq(schoolLicences.createdBy, userProfile.id))
      .where(eq(schoolLicences.id, id))
      .limit(1);

    if (licenceData.length === 0) return null;

    return {
      ...licenceData[0].licence,
      school: licenceData[0].school,
      createdBy: licenceData[0].createdBy,
    };
  },

  create: (data: {
    schoolId: string;
    status:
      | "DRAFT"
      | "PENDING"
      | "ACTIVE"
      | "SUSPENDED"
      | "EXPIRED"
      | "CANCELLED";
    startDate: string;
    endDate: string;
    maxUsers?: number;
    features?: Record<string, any>;
    createdByUserId: string;
    metadata?: Record<string, any>;
  }) => db.insert(schoolLicences).values(data).returning(),

  update: (
    id: string,
    data: {
      status?:
        | "DRAFT"
        | "PENDING"
        | "ACTIVE"
        | "SUSPENDED"
        | "EXPIRED"
        | "CANCELLED";
      startDate?: string;
      endDate?: string;
      maxUsers?: number;
      features?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ) =>
    db
      .update(schoolLicences)
      .set(data)
      .where(eq(schoolLicences.id, id))
      .returning(),

  delete: (id: string) =>
    db.delete(schoolLicences).where(eq(schoolLicences.id, id)),

  getActiveBySchoolId: (schoolId: string) =>
    db
      .select()
      .from(schoolLicences)
      .where(
        and(
          eq(schoolLicences.schoolId, schoolId),
          eq(schoolLicences.status, "ACTIVE")
        )
      )
      .orderBy(desc(schoolLicences.createdAt))
      .limit(1),
};
