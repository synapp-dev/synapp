import { describe, expect, it } from "vitest";

import { computeComplianceStatus } from "@/server/workforce/people-compliance";

describe("computeComplianceStatus", () => {
  it("returns green when mandatory fields are present", () => {
    const result = computeComplianceStatus({
      fwisIssuedDate: "2026-01-01",
      ceisIssuedDate: "2026-01-01",
      employmentType: "full_time",
      lastVevoCheckDate: null,
      vevoReference: null,
      visaSubclass: null,
      tfnStatus: "provided",
      superFundUsi: "USI123",
      taxTreatmentCode: "RTXXXX",
      employmentStatus: "active",
    });
    expect(result.status).toBe("green");
    expect(result.warnings).toHaveLength(0);
  });

  it("returns amber when VEVO is incomplete for visa holder", () => {
    const result = computeComplianceStatus({
      fwisIssuedDate: "2026-01-01",
      ceisIssuedDate: null,
      employmentType: "full_time",
      lastVevoCheckDate: null,
      vevoReference: null,
      visaSubclass: "482",
      tfnStatus: "provided",
      superFundUsi: "USI123",
      taxTreatmentCode: "RTXXXX",
      employmentStatus: "active",
    });
    expect(result.status).toBe("amber");
    expect(result.warnings.some((w) => w.code === "vevo_incomplete")).toBe(true);
  });
});
