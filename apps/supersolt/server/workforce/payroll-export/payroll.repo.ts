import { createHash } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  employeePayrollProfiles,
  leaveTypes,
  organisationPayrollSettings,
  organisations,
  payPeriods,
  payRunLineItems,
  payRuns,
  payrollAuditLog,
  payrollLeaveLines,
  payrollPreflightChecks,
  payrollTimesheetLines,
  payrollXeroPushLog,
  timesheets,
  userProfiles,
  venueXeroConnections,
} from "@/server/db/schema";

type PayrollAdminDb = Pick<AppDb, "admin">;

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

export const payrollRepo = {
  async getOrganisationIdBySlug(tx: RlsTx, slug: string) {
    const rows = await tx
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.slug, slug))
      .limit(1);
    return rows[0]?.id ?? null;
  },

  async listPayPeriodsWithRuns(tx: RlsTx, organisationId: string) {
    return tx
      .select({
        period: payPeriods,
        run: payRuns,
      })
      .from(payPeriods)
      .leftJoin(
        payRuns,
        and(
          eq(payRuns.payPeriodId, payPeriods.id),
          eq(payRuns.isCorrectionRun, false),
        ),
      )
      .where(eq(payPeriods.organisationId, organisationId))
      .orderBy(desc(payPeriods.endDate))
      .limit(12);
  },

  async getPayRunById(tx: RlsTx, payRunId: string, organisationId: string) {
    const rows = await tx
      .select()
      .from(payRuns)
      .where(and(eq(payRuns.id, payRunId), eq(payRuns.organisationId, organisationId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async getPrimaryRunForPeriod(tx: RlsTx, organisationId: string, payPeriodId: string) {
    const rows = await tx
      .select()
      .from(payRuns)
      .where(
        and(
          eq(payRuns.organisationId, organisationId),
          eq(payRuns.payPeriodId, payPeriodId),
          eq(payRuns.isCorrectionRun, false),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async insertPayRun(tx: RlsTx, row: typeof payRuns.$inferInsert) {
    const inserted = await tx.insert(payRuns).values(row).returning();
    return inserted[0]!;
  },

  async updatePayRun(
    tx: RlsTx,
    payRunId: string,
    patch: Partial<typeof payRuns.$inferInsert>,
  ) {
    const updated = await tx
      .update(payRuns)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(payRuns.id, payRunId))
      .returning();
    return updated[0] ?? null;
  },

  async updatePayRunAdmin(
    db: AppDb["admin"],
    payRunId: string,
    patch: Partial<typeof payRuns.$inferInsert>,
  ) {
    const updated = await db
      .update(payRuns)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(payRuns.id, payRunId))
      .returning();
    return updated[0] ?? null;
  },

  async listLineItems(tx: RlsTx, payRunId: string) {
    return tx
      .select()
      .from(payRunLineItems)
      .where(eq(payRunLineItems.payRunId, payRunId))
      .orderBy(payRunLineItems.grossCents);
  },

  async listLineItemsAdmin(db: AppDb["admin"], payRunId: string) {
    return db
      .select()
      .from(payRunLineItems)
      .where(eq(payRunLineItems.payRunId, payRunId))
      .orderBy(payRunLineItems.grossCents);
  },

  async replaceLineItems(
    tx: RlsTx,
    payRunId: string,
    organisationId: string,
    items: Array<typeof payRunLineItems.$inferInsert>,
  ) {
    await tx.delete(payRunLineItems).where(eq(payRunLineItems.payRunId, payRunId));
    if (items.length === 0) return [];
    return tx.insert(payRunLineItems).values(items).returning();
  },

  async countApprovedStagingLines(tx: RlsTx, organisationId: string, payPeriodId: string) {
    const rows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(payrollTimesheetLines)
      .where(
        and(
          eq(payrollTimesheetLines.organisationId, organisationId),
          eq(payrollTimesheetLines.payPeriodId, payPeriodId),
        ),
      );
    return rows[0]?.count ?? 0;
  },

  async listTimesheetStagingLines(tx: RlsTx, organisationId: string, payPeriodId: string) {
    return tx
      .select()
      .from(payrollTimesheetLines)
      .where(
        and(
          eq(payrollTimesheetLines.organisationId, organisationId),
          eq(payrollTimesheetLines.payPeriodId, payPeriodId),
        ),
      );
  },

  async listLeaveStagingLines(
    tx: RlsTx,
    organisationId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    return tx
      .select({
        line: payrollLeaveLines,
        leaveTypeCode: leaveTypes.code,
      })
      .from(payrollLeaveLines)
      .innerJoin(leaveTypes, eq(leaveTypes.id, payrollLeaveLines.leaveTypeId))
      .where(
        and(
          eq(payrollLeaveLines.organisationId, organisationId),
          sql`${payrollLeaveLines.payPeriodStart} >= ${periodStart}`,
          sql`${payrollLeaveLines.payPeriodEnd} <= ${periodEnd}`,
        ),
      );
  },

  async listPayrollProfiles(tx: RlsTx, organisationId: string, userProfileIds: string[]) {
    if (userProfileIds.length === 0) return [];
    return tx
      .select()
      .from(employeePayrollProfiles)
      .where(
        and(
          eq(employeePayrollProfiles.organisationId, organisationId),
          inArray(employeePayrollProfiles.userProfileId, userProfileIds),
        ),
      );
  },

  async getPayrollSettings(tx: RlsTx, organisationId: string) {
    const rows = await tx
      .select()
      .from(organisationPayrollSettings)
      .where(eq(organisationPayrollSettings.organisationId, organisationId))
      .limit(1);
    return rows[0] ?? null;
  },

  async getPayrollSettingsAdmin(db: AppDb["admin"], organisationId: string) {
    const rows = await db
      .select()
      .from(organisationPayrollSettings)
      .where(eq(organisationPayrollSettings.organisationId, organisationId))
      .limit(1);
    return rows[0] ?? null;
  },

  async getXeroConnectionForOrg(tx: RlsTx, organisationId: string, venueId: string | null) {
    if (!venueId) return null;
    const rows = await tx
      .select({
        xeroTenantId: venueXeroConnections.xeroTenantId,
        xeroTenantName: venueXeroConnections.xeroTenantName,
      })
      .from(venueXeroConnections)
      .where(eq(venueXeroConnections.venueId, venueId))
      .limit(1);
    return rows[0] ?? null;
  },

  async getXeroConnectionAdmin(appDb: PayrollAdminDb, venueId: string) {
    const rows = await appDb.admin
      .select()
      .from(venueXeroConnections)
      .where(eq(venueXeroConnections.venueId, venueId))
      .limit(1);
    return rows[0] ?? null;
  },

  async insertPreflightCheck(tx: RlsTx, row: typeof payrollPreflightChecks.$inferInsert) {
    const inserted = await tx.insert(payrollPreflightChecks).values(row).returning();
    return inserted[0]!;
  },

  async insertAuditLog(tx: RlsTx, row: Omit<typeof payrollAuditLog.$inferInsert, "contentHash">) {
    const contentHash = createHash("sha256")
      .update(JSON.stringify({ ...row, at: new Date().toISOString() }))
      .digest("hex");
    const inserted = await tx
      .insert(payrollAuditLog)
      .values({ ...row, contentHash })
      .returning();
    return inserted[0]!;
  },

  async insertXeroPushLog(tx: RlsTx, row: typeof payrollXeroPushLog.$inferInsert) {
    await tx.insert(payrollXeroPushLog).values(row);
  },

  async insertXeroPushLogAdmin(db: AppDb["admin"], row: typeof payrollXeroPushLog.$inferInsert) {
    await db.insert(payrollXeroPushLog).values(row);
  },

  async lockTimesheetsForPayRun(tx: RlsTx, payRunId: string, payPeriodId: string) {
    return tx
      .update(timesheets)
      .set({
        status: "locked",
        lockedInPayrollExportId: payRunId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(timesheets.payPeriodId, payPeriodId),
          eq(timesheets.status, "approved"),
        ),
      )
      .returning({ id: timesheets.id });
  },

  async lockTimesheetsForPayRunAdmin(db: AppDb["admin"], payRunId: string, payPeriodId: string) {
    return db
      .update(timesheets)
      .set({
        status: "locked",
        lockedInPayrollExportId: payRunId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(timesheets.payPeriodId, payPeriodId),
          eq(timesheets.status, "approved"),
        ),
      )
      .returning({ id: timesheets.id });
  },

  async linkStagingToPayRun(
    tx: RlsTx,
    payRunId: string,
    organisationId: string,
    payPeriodId: string,
  ) {
    await tx
      .update(payrollTimesheetLines)
      .set({ payRunId })
      .where(
        and(
          eq(payrollTimesheetLines.organisationId, organisationId),
          eq(payrollTimesheetLines.payPeriodId, payPeriodId),
        ),
      );
  },

  async linkStagingToPayRunAdmin(
    db: AppDb["admin"],
    payRunId: string,
    organisationId: string,
    payPeriodId: string,
  ) {
    await db
      .update(payrollTimesheetLines)
      .set({ payRunId })
      .where(
        and(
          eq(payrollTimesheetLines.organisationId, organisationId),
          eq(payrollTimesheetLines.payPeriodId, payPeriodId),
        ),
      );
  },

  async getStaffNames(tx: RlsTx, userProfileIds: string[]) {
    if (userProfileIds.length === 0) return new Map<string, string>();
    const rows = await tx
      .select({
        id: userProfiles.id,
        fullName: userProfiles.fullName,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: userProfiles.email,
      })
      .from(userProfiles)
      .where(inArray(userProfiles.id, userProfileIds));
    const map = new Map<string, string>();
    for (const r of rows) {
      const name =
        r.fullName?.trim() ||
        [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
        r.email;
      map.set(r.id, name);
    }
    return map;
  },

  async getPayPeriod(tx: RlsTx, payPeriodId: string, organisationId: string) {
    const rows = await tx
      .select()
      .from(payPeriods)
      .where(
        and(eq(payPeriods.id, payPeriodId), eq(payPeriods.organisationId, organisationId)),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  toProfileRow(row: typeof employeePayrollProfiles.$inferSelect) {
    return {
      userProfileId: row.userProfileId,
      payRateCents: row.payRateCents,
      awardCode: row.awardCode,
      awardClassification: row.awardClassification,
      awardGrade: row.awardGrade,
      dateOfBirth: row.dateOfBirth,
      taxTreatmentCode: row.taxTreatmentCode,
      tfn: row.tfn,
      superFundUsi: row.superFundUsi,
      superMemberNumber: row.superMemberNumber,
      bankBsb: row.bankBsb,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
      stp2IncomeType: row.stp2IncomeType,
      fdvPayslipLabel: row.fdvPayslipLabel,
    };
  },

  stagingLineGross(line: typeof payrollTimesheetLines.$inferSelect) {
    return line.grossCents ?? Math.round(num(line.hours) * line.baseRateCents);
  },

  async listPayRunsByStatusAdmin(
    db: AppDb["admin"],
    status: typeof payRuns.$inferSelect.status,
    limit = 50,
  ) {
    return db
      .select()
      .from(payRuns)
      .where(eq(payRuns.status, status))
      .orderBy(desc(payRuns.xeroPushAttemptedAt))
      .limit(limit);
  },

  async listStaleSentToXeroAdmin(db: AppDb["admin"], staleHours: number, limit = 50) {
    return db
      .select()
      .from(payRuns)
      .where(
        and(
          eq(payRuns.status, "sent_to_xero"),
          sql`${payRuns.xeroFinalisedAt} IS NULL`,
          sql`${payRuns.xeroPushAttemptedAt} < now() - (${staleHours} || ' hours')::interval`,
        ),
      )
      .orderBy(payRuns.xeroPushAttemptedAt)
      .limit(limit);
  },

  async getPayRunByXeroIdAdmin(db: AppDb["admin"], xeroPayRunId: string) {
    const rows = await db
      .select()
      .from(payRuns)
      .where(eq(payRuns.xeroPayRunId, xeroPayRunId))
      .limit(1);
    return rows[0] ?? null;
  },

  async getPayRunByIdAdmin(db: AppDb["admin"], payRunId: string) {
    const rows = await db.select().from(payRuns).where(eq(payRuns.id, payRunId)).limit(1);
    return rows[0] ?? null;
  },
};
