import { eq } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { leaveTypes } from "@/server/db/schema";

export type DefaultLeaveTypeSeed = {
  code: string;
  name: string;
  isPaid: boolean;
  isAccruable: boolean;
  accrualRatePct: number | null;
  accrualBasis: "hours_worked" | "years_service" | "per_occasion" | "calendar_year" | "none";
  defaultApprovalRole: "manager" | "owner";
  isPerOccasion: boolean;
  isPrivate: boolean;
};

/** AU Fair Work statutory defaults per Notion Leave spec. */
export const DEFAULT_LEAVE_TYPES: DefaultLeaveTypeSeed[] = [
  {
    code: "annual",
    name: "Annual leave",
    isPaid: true,
    isAccruable: true,
    accrualRatePct: 7.3,
    accrualBasis: "hours_worked",
    defaultApprovalRole: "manager",
    isPerOccasion: false,
    isPrivate: false,
  },
  {
    code: "personal",
    name: "Personal / Carer's leave",
    isPaid: true,
    isAccruable: true,
    accrualRatePct: 3.7,
    accrualBasis: "hours_worked",
    defaultApprovalRole: "manager",
    isPerOccasion: false,
    isPrivate: false,
  },
  {
    code: "long_service",
    name: "Long service leave",
    isPaid: true,
    isAccruable: true,
    accrualRatePct: null,
    accrualBasis: "years_service",
    defaultApprovalRole: "owner",
    isPerOccasion: false,
    isPrivate: false,
  },
  {
    code: "public_holiday",
    name: "Public holiday",
    isPaid: true,
    isAccruable: false,
    accrualRatePct: null,
    accrualBasis: "none",
    defaultApprovalRole: "manager",
    isPerOccasion: false,
    isPrivate: false,
  },
  {
    code: "compassionate",
    name: "Compassionate leave",
    isPaid: true,
    isAccruable: false,
    accrualRatePct: null,
    accrualBasis: "per_occasion",
    defaultApprovalRole: "manager",
    isPerOccasion: true,
    isPrivate: false,
  },
  {
    code: "parental",
    name: "Parental leave",
    isPaid: false,
    isAccruable: false,
    accrualRatePct: null,
    accrualBasis: "none",
    defaultApprovalRole: "owner",
    isPerOccasion: false,
    isPrivate: false,
  },
  {
    code: "unpaid",
    name: "Unpaid leave",
    isPaid: false,
    isAccruable: false,
    accrualRatePct: null,
    accrualBasis: "none",
    defaultApprovalRole: "manager",
    isPerOccasion: false,
    isPrivate: false,
  },
  {
    code: "dfv",
    name: "Domestic and family violence leave",
    isPaid: true,
    isAccruable: false,
    accrualRatePct: null,
    accrualBasis: "calendar_year",
    defaultApprovalRole: "manager",
    isPerOccasion: false,
    isPrivate: true,
  },
  {
    code: "community_service",
    name: "Community service / Jury duty",
    isPaid: true,
    isAccruable: false,
    accrualRatePct: null,
    accrualBasis: "per_occasion",
    defaultApprovalRole: "manager",
    isPerOccasion: true,
    isPrivate: false,
  },
];

export async function seedDefaultLeaveTypes(tx: RlsTx, organisationId: string): Promise<void> {
  const existing = await tx
    .select({ id: leaveTypes.id })
    .from(leaveTypes)
    .where(eq(leaveTypes.organisationId, organisationId))
    .limit(1);

  if (existing.length > 0) return;

  for (const row of DEFAULT_LEAVE_TYPES) {
    await tx.insert(leaveTypes).values({
      organisationId,
      code: row.code,
      name: row.name,
      isPaid: row.isPaid,
      isAccruable: row.isAccruable,
      accrualRatePct: row.accrualRatePct != null ? String(row.accrualRatePct) : null,
      accrualBasis: row.accrualBasis,
      defaultApprovalRole: row.defaultApprovalRole,
      isPerOccasion: row.isPerOccasion,
      isPrivate: row.isPrivate,
      isDefault: true,
      isArchived: false,
    });
  }
}
