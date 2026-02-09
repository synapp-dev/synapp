import { db } from "@/server/db/drizzle";
import {
  schools,
  lessons,
  userRoles,
  roles,
  classes,
  schoolLicences,
} from "@/server/db/schema";
import { getUserScopedRoles } from "../auth/rbac";
import { checkFeatureAccess } from "@/server/features/features.service";
import { eq, and, sql, inArray } from "drizzle-orm";

type AuthContext = {
  userId: string | null;
};

type MetricValue = {
  amount: number;
  type: "number" | "percentage";
};

type MetricResponse = {
  value: MetricValue;
  previousValue: MetricValue;
};

// Helper function to get date ranges for current and previous month
function getDateRanges() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999
  );

  return {
    currentMonthStart: currentMonthStart.toISOString(),
    previousMonthStart: previousMonthStart.toISOString(),
    previousMonthEnd: previousMonthEnd.toISOString(),
  };
}

// Helper function to get user's school IDs
async function getUserSchoolIds(userId: string): Promise<string[]> {
  const roles = await getUserScopedRoles(userId);
  return roles.school.map((r) => r.schoolId);
}

export const metricsService = {
  async getSchoolCount(
    ctx: AuthContext,
    params: { scope?: string }
  ): Promise<MetricResponse> {
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    const hasScopeAll = await checkFeatureAccess(ctx.userId, "/admin/schools");
    const { currentMonthStart, previousMonthStart, previousMonthEnd } =
      getDateRanges();

    let currentWhereConditions: any[] = [];
    let previousWhereConditions: any[] = [];

    if (params.scope === "all") {
      if (!hasScopeAll) {
        throw new Error("Unauthorized");
      }
    } else {
      const schoolIds = await getUserSchoolIds(ctx.userId);
      if (schoolIds.length === 0 && !hasScopeAll) {
        // User has no schools, return zeros
        return {
          value: { amount: 0, type: "number" },
          previousValue: { amount: 0, type: "number" },
        };
      }
      if (schoolIds.length > 0) {
        currentWhereConditions.push(inArray(schools.id, schoolIds));
        previousWhereConditions.push(inArray(schools.id, schoolIds));
      }
    }

    // Filter by date for current month (schools created this month)
    currentWhereConditions.push(
      sql`${schools.createdAt} >= ${currentMonthStart}`
    );

    // Filter by date for previous month
    previousWhereConditions.push(
      sql`${schools.createdAt} >= ${previousMonthStart} AND ${schools.createdAt} <= ${previousMonthEnd}`
    );

    const currentQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(schools)
      .where(and(...currentWhereConditions));

    const previousQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(schools)
      .where(and(...previousWhereConditions));

    const [currentResult] = await currentQuery;
    const [previousResult] = await previousQuery;

    // Get total count (not just this month's new schools)
    let totalCurrentWhereConditions: any[] = [];
    let totalPreviousWhereConditions: any[] = [];

    if (params.scope !== "all") {
      const schoolIds = await getUserSchoolIds(ctx.userId);
      if (schoolIds.length > 0) {
        totalCurrentWhereConditions.push(inArray(schools.id, schoolIds));
        totalPreviousWhereConditions.push(inArray(schools.id, schoolIds));
      }
    }

    // For previous month, get count at end of previous month
    totalPreviousWhereConditions.push(
      sql`${schools.createdAt} <= ${previousMonthEnd}`
    );

    const totalCurrentQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(schools)
      .where(
        totalCurrentWhereConditions.length > 0
          ? and(...totalCurrentWhereConditions)
          : undefined
      );

    const totalPreviousQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(schools)
      .where(and(...totalPreviousWhereConditions));

    const [totalCurrentResult] = await totalCurrentQuery;
    const [totalPreviousResult] = await totalPreviousQuery;

    return {
      value: {
        amount: Number(totalCurrentResult?.count || 0),
        type: "number",
      },
      previousValue: {
        amount: Number(totalPreviousResult?.count || 0),
        type: "number",
      },
    };
  },

  async getTeacherCount(
    ctx: AuthContext,
    params: { scope?: string }
  ): Promise<MetricResponse> {
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    const hasScopeAll = await checkFeatureAccess(ctx.userId, "/admin/schools");
    const { previousMonthEnd } = getDateRanges();

    let currentWhereConditions = [eq(roles.key, "TEACHER")];
    let previousWhereConditions = [
      eq(roles.key, "TEACHER"),
      sql`${userRoles.assignedAt} <= ${previousMonthEnd}`,
    ];

    if (params.scope === "all") {
      if (!hasScopeAll) {
        throw new Error("Unauthorized");
      }
    } else {
      const schoolIds = await getUserSchoolIds(ctx.userId);
      if (schoolIds.length === 0 && !hasScopeAll) {
        return {
          value: { amount: 0, type: "number" },
          previousValue: { amount: 0, type: "number" },
        };
      }
      if (schoolIds.length > 0) {
        currentWhereConditions.push(inArray(userRoles.schoolId, schoolIds));
        previousWhereConditions.push(inArray(userRoles.schoolId, schoolIds));
      }
    }

    // Use a subquery approach: first get distinct user_ids, then count them
    // For current period
    const currentDistinctUsers = await db
      .selectDistinct({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(...currentWhereConditions));

    // For previous period
    const previousDistinctUsers = await db
      .selectDistinct({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(...previousWhereConditions));

    return {
      value: {
        amount: currentDistinctUsers.length,
        type: "number",
      },
      previousValue: {
        amount: previousDistinctUsers.length,
        type: "number",
      },
    };
  },

  async getCompletedLessonsCount(
    ctx: AuthContext,
    params: { scope?: string }
  ): Promise<MetricResponse> {
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    const hasScopeAll = await checkFeatureAccess(ctx.userId, "/admin/lessons");
    const { currentMonthStart, previousMonthStart, previousMonthEnd } =
      getDateRanges();

    let currentWhereConditions = [
      eq(lessons.status, "completed"),
      sql`${lessons.createdAt} >= ${currentMonthStart}`,
    ];

    let previousWhereConditions = [
      eq(lessons.status, "completed"),
      sql`${lessons.createdAt} >= ${previousMonthStart}`,
      sql`${lessons.createdAt} <= ${previousMonthEnd}`,
    ];

    if (params.scope === "all") {
      if (!hasScopeAll) {
        throw new Error("Unauthorized");
      }
    } else {
      const schoolIds = await getUserSchoolIds(ctx.userId);
      if (schoolIds.length === 0 && !hasScopeAll) {
        return {
          value: { amount: 0, type: "number" },
          previousValue: { amount: 0, type: "number" },
        };
      }
      if (schoolIds.length > 0) {
        currentWhereConditions.push(inArray(lessons.schoolId, schoolIds));
        previousWhereConditions.push(inArray(lessons.schoolId, schoolIds));
      }
    }

    const currentQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(lessons)
      .where(and(...currentWhereConditions));

    const previousQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(lessons)
      .where(and(...previousWhereConditions));

    const [currentResult] = await currentQuery;
    const [previousResult] = await previousQuery;

    return {
      value: {
        amount: Number(currentResult?.count || 0),
        type: "number",
      },
      previousValue: {
        amount: Number(previousResult?.count || 0),
        type: "number",
      },
    };
  },

  async getEngagementRate(
    ctx: AuthContext,
    params: { scope?: string }
  ): Promise<MetricResponse> {
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }

    const hasScopeAll = await checkFeatureAccess(ctx.userId, "/admin/lessons");
    const { currentMonthStart, previousMonthStart, previousMonthEnd } =
      getDateRanges();

    const activeSchoolsQuery = db
      .select({ id: schools.id })
      .from(schools)
      .innerJoin(schoolLicences, eq(schools.id, schoolLicences.schoolId))
      .where(eq(schoolLicences.status, "ACTIVE"));

    let activeSchools = await activeSchoolsQuery;
    if (params.scope !== "all") {
      const schoolIds = await getUserSchoolIds(ctx.userId);
      if (schoolIds.length > 0) {
        activeSchools = activeSchools.filter((s) => schoolIds.includes(s.id));
      } else if (!hasScopeAll) {
        return {
          value: { amount: 0, type: "percentage" },
          previousValue: { amount: 0, type: "percentage" },
        };
      }
    } else {
      if (!hasScopeAll) {
        throw new Error("Unauthorized");
      }
    }

    const activeSchoolIds = activeSchools.map((s) => s.id);

    if (activeSchoolIds.length === 0) {
      return {
        value: { amount: 0, type: "percentage" },
        previousValue: { amount: 0, type: "percentage" },
      };
    }

    // Get total classes for active schools
    const classesQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(inArray(classes.schoolId, activeSchoolIds));

    const [classesResult] = await classesQuery;
    const totalClasses = Number(classesResult?.count || 0);
    const activeSchoolsCount = activeSchoolIds.length;

    // Calculate denominator: total classes * active schools
    const denominator = totalClasses * activeSchoolsCount;

    if (denominator === 0) {
      return {
        value: { amount: 0, type: "percentage" },
        previousValue: { amount: 0, type: "percentage" },
      };
    }

    // Get completed lessons for current month
    let currentLessonsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(lessons)
      .where(
        and(
          eq(lessons.status, "completed"),
          sql`${lessons.createdAt} >= ${currentMonthStart}`,
          inArray(lessons.schoolId, activeSchoolIds)
        )
      );

    // Get completed lessons for previous month
    let previousLessonsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(lessons)
      .where(
        and(
          eq(lessons.status, "completed"),
          sql`${lessons.createdAt} >= ${previousMonthStart}`,
          sql`${lessons.createdAt} <= ${previousMonthEnd}`,
          inArray(lessons.schoolId, activeSchoolIds)
        )
      );

    const [currentLessonsResult] = await currentLessonsQuery;
    const [previousLessonsResult] = await previousLessonsQuery;

    const currentCompleted = Number(currentLessonsResult?.count || 0);
    const previousCompleted = Number(previousLessonsResult?.count || 0);

    // Calculate rates: (lessons completed) / (total classes * active schools) * 100
    const currentRate = (currentCompleted / denominator) * 100;
    const previousRate = (previousCompleted / denominator) * 100;

    return {
      value: {
        amount: Math.round(currentRate * 100) / 100, // Round to 2 decimal places
        type: "percentage",
      },
      previousValue: {
        amount: Math.round(previousRate * 100) / 100, // Round to 2 decimal places
        type: "percentage",
      },
    };
  },
};
