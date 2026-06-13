import { describe, expect, it } from "vitest";
import {
  aggregateEmployeeLines,
  computeBaseWages,
  computePaygCents,
  computeSuperCents,
  getAwardMinimumCents,
  juniorRateMultiplier,
} from "@/server/workforce/payroll-export/payroll-calculation";
import {
  canEditLineItem,
  canTransitionPayRunStatus,
  stripFdvFromLineItemDto,
} from "@/server/workforce/payroll-export/payroll-policy";
import { runPreflight } from "@/server/workforce/payroll-export/payroll-preflight";

describe("payroll-calculation", () => {
  it("sums timesheet gross via computeBaseWages", () => {
    expect(
      computeBaseWages([
        { userProfileId: "a", hours: 8, baseRateCents: 2500, grossCents: 20000 },
        { userProfileId: "a", hours: 2, baseRateCents: 2500, grossCents: 5000 },
      ]),
    ).toBe(25000);
  });

  it("applies junior multiplier at age 19", () => {
    expect(juniorRateMultiplier(19)).toBe(0.9);
  });

  it("computes super at 12%", () => {
    expect(computeSuperCents(100_00)).toBe(12_00);
  });

  it("uses 47% withholding when TFN missing", () => {
    expect(computePaygCents({ grossCents: 100_00, taxTreatmentCode: "X", tfn: null })).toBe(47_00);
  });

  it("aggregates employee lines with leave", () => {
    const profiles = new Map([
      [
        "u1",
        {
          userProfileId: "u1",
          payRateCents: 2500,
          awardCode: null,
          awardClassification: null,
          awardGrade: null,
          dateOfBirth: null,
          taxTreatmentCode: "123456",
          tfn: "123",
          superFundUsi: "x",
          superMemberNumber: "y",
          bankBsb: "063",
          bankAccountNumber: "1",
          bankAccountName: "A",
          stp2IncomeType: "SAW",
          fdvPayslipLabel: "other_paid_leave",
        },
      ],
    ]);
    const result = aggregateEmployeeLines(
      [{ userProfileId: "u1", hours: 10, baseRateCents: 2500, grossCents: 250_00 }],
      [{ userProfileId: "u1", hours: 8, rateCents: 2500, isFdv: true }],
      profiles,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.hasFdvLeave).toBe(true);
    expect(result[0]?.grossCents).toBeGreaterThan(250_00);
  });

  it("returns award minimum for MA000119 Level 2", () => {
    expect(getAwardMinimumCents("MA000119", "2")).toBe(2520);
  });
});

describe("payroll-policy", () => {
  it("allows draft to pending_owner_approval", () => {
    expect(canTransitionPayRunStatus("draft", "pending_owner_approval")).toBe(true);
  });

  it("allows pending to returned_for_revision", () => {
    expect(canTransitionPayRunStatus("pending_owner_approval", "returned_for_revision")).toBe(true);
  });

  it("blocks line edit when approved", () => {
    expect(canEditLineItem("approved")).toBe(false);
  });

  it("strips FDV fields for managers", () => {
    const stripped = stripFdvFromLineItemDto(
      {
        id: "1",
        userProfileId: "u",
        staffName: "Test",
        hoursTotal: 8,
        grossCents: 100,
        superCents: 12,
        paygCents: 20,
        netCents: 80,
        hasOverrides: false,
        hasFdvLeave: true,
        fdvPayslipLabel: "secret",
        isTermination: false,
      },
      false,
    );
    expect(stripped.hasFdvLeave).toBe(false);
    expect(stripped.fdvPayslipLabel).toBeNull();
  });
});

describe("payroll-preflight", () => {
  it("hard-blocks missing TFN", () => {
    const result = runPreflight({
      profiles: [
        {
          userProfileId: "u1",
          payRateCents: 3000,
          awardCode: null,
          awardClassification: null,
          awardGrade: null,
          dateOfBirth: null,
          taxTreatmentCode: "123456",
          tfn: null,
          superFundUsi: "usi",
          superMemberNumber: "mem",
          bankBsb: "063",
          bankAccountNumber: "123",
          bankAccountName: "Acct",
          stp2IncomeType: "SAW",
          fdvPayslipLabel: null,
        },
      ],
      staffNames: new Map([["u1", "Alex"]]),
    });
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.code === "missing_tfn")).toBe(true);
  });
});
