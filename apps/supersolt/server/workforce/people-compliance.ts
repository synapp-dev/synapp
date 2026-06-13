export type ComplianceStatus = "green" | "amber" | "red";

export type PeopleWarning = {
  code: string;
  message: string;
};

export type ComplianceInput = {
  fwisIssuedDate: string | null;
  ceisIssuedDate: string | null;
  employmentType: string;
  lastVevoCheckDate: string | null;
  vevoReference: string | null;
  visaSubclass: string | null;
  tfnStatus: string | null;
  superFundUsi: string | null;
  taxTreatmentCode: string | null;
  employmentStatus: string;
};

export function computeComplianceStatus(
  input: ComplianceInput,
): { status: ComplianceStatus; warnings: PeopleWarning[] } {
  const warnings: PeopleWarning[] = [];

  if (!input.fwisIssuedDate) {
    warnings.push({
      code: "fwis_missing",
      message: "FWIS issuance date is not recorded.",
    });
  }

  if (input.employmentType === "casual" && !input.ceisIssuedDate) {
    warnings.push({
      code: "ceis_missing",
      message: "CEIS issuance date is not recorded for this casual employee.",
    });
  }

  if (input.visaSubclass && (!input.lastVevoCheckDate || !input.vevoReference)) {
    warnings.push({
      code: "vevo_incomplete",
      message: "VEVO check details are incomplete for this visa holder.",
    });
  }

  if (!input.tfnStatus || input.tfnStatus === "pending") {
    warnings.push({
      code: "tfn_pending",
      message: "TFN is not yet on file.",
    });
  }

  if (!input.superFundUsi) {
    warnings.push({
      code: "super_fund_missing",
      message: "Super fund details are missing.",
    });
  }

  if (!input.taxTreatmentCode) {
    warnings.push({
      code: "tax_treatment_missing",
      message: "Tax treatment code is missing.",
    });
  }

  if (input.employmentStatus === "terminated") {
    return { status: "red", warnings };
  }

  if (warnings.some((w) => w.code === "vevo_incomplete")) {
    return { status: "amber", warnings };
  }

  if (warnings.length > 0) {
    return { status: "amber", warnings };
  }

  return { status: "green", warnings };
}
