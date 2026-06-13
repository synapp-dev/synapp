import {
  type EmployeePayrollProfile,
  awardMinimumKey,
  getAwardMinimumCents,
} from "@/server/workforce/payroll-export/payroll-calculation";

export type PreflightIssue = {
  userProfileId: string;
  staffName: string;
  code: string;
  severity: "hard_block" | "soft_warning";
  message: string;
};

export type PreflightResult = {
  passed: boolean;
  hardBlockCount: number;
  softWarningCount: number;
  issues: PreflightIssue[];
};

function missingField(
  profile: EmployeePayrollProfile,
  field: keyof EmployeePayrollProfile,
): boolean {
  const v = profile[field];
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

export function runPreflight(args: {
  profiles: EmployeePayrollProfile[];
  staffNames: Map<string, string>;
  wageTheftExemptUserIds?: Set<string>;
}): PreflightResult {
  const issues: PreflightIssue[] = [];

  for (const profile of args.profiles) {
    const name = args.staffNames.get(profile.userProfileId) ?? "Employee";

    if (missingField(profile, "tfn")) {
      issues.push({
        userProfileId: profile.userProfileId,
        staffName: name,
        code: "missing_tfn",
        severity: "hard_block",
        message: `${name}: TFN is required before payroll can run.`,
      });
    }
    if (missingField(profile, "superFundUsi") || missingField(profile, "superMemberNumber")) {
      issues.push({
        userProfileId: profile.userProfileId,
        staffName: name,
        code: "missing_super",
        severity: "hard_block",
        message: `${name}: Super fund USI and member number are required.`,
      });
    }
    if (
      missingField(profile, "bankBsb") ||
      missingField(profile, "bankAccountNumber") ||
      missingField(profile, "bankAccountName")
    ) {
      issues.push({
        userProfileId: profile.userProfileId,
        staffName: name,
        code: "missing_bank",
        severity: "hard_block",
        message: `${name}: Bank details are required.`,
      });
    }
    if (missingField(profile, "taxTreatmentCode")) {
      issues.push({
        userProfileId: profile.userProfileId,
        staffName: name,
        code: "missing_tax_code",
        severity: "hard_block",
        message: `${name}: Tax treatment code is required.`,
      });
    }
    if (missingField(profile, "stp2IncomeType")) {
      issues.push({
        userProfileId: profile.userProfileId,
        staffName: name,
        code: "missing_stp2_income_type",
        severity: "hard_block",
        message: `${name}: STP2 income type is required.`,
      });
    }
    if (
      profile.awardCode &&
      (missingField(profile, "awardClassification") || missingField(profile, "awardGrade"))
    ) {
      issues.push({
        userProfileId: profile.userProfileId,
        staffName: name,
        code: "missing_classification",
        severity: "soft_warning",
        message: `${name}: Award classification and grade are recommended.`,
      });
    }

    const minRate = getAwardMinimumCents(profile.awardCode, profile.awardGrade);
    const rate = profile.payRateCents;
    if (
      minRate != null &&
      rate != null &&
      rate < minRate &&
      !args.wageTheftExemptUserIds?.has(profile.userProfileId)
    ) {
      issues.push({
        userProfileId: profile.userProfileId,
        staffName: name,
        code: "wage_theft_block",
        severity: "hard_block",
        message: `${name}: Pay rate is below award minimum (${awardMinimumKey(profile.awardCode, profile.awardGrade)}). Resolve before continuing.`,
      });
    }
  }

  const hardBlockCount = issues.filter((i) => i.severity === "hard_block").length;
  const softWarningCount = issues.filter((i) => i.severity === "soft_warning").length;

  return {
    passed: hardBlockCount === 0,
    hardBlockCount,
    softWarningCount,
    issues,
  };
}
