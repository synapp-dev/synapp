import { describe, expect, it } from "vitest";
import {
  abnKey,
  decideSupplierIdentity,
  findNameContainmentMatch,
  namesFoldByContainment,
} from "./supplier-identity";

describe("abnKey", () => {
  it("normalizes a formatted ABN to its 11 digits", () => {
    expect(abnKey("56 689 549 022")).toBe("56689549022");
  });

  it("rejects a partial read", () => {
    expect(abnKey("68954902")).toBeNull();
  });

  it("rejects empty and null", () => {
    expect(abnKey("")).toBeNull();
    expect(abnKey(null)).toBeNull();
  });
});

describe("namesFoldByContainment", () => {
  it("folds a short docket name into the full legal name", () => {
    expect(
      namesFoldByContainment("Cookers", "Cookers Bulk Oil System Pty Ltd"),
    ).toBe(true);
  });

  it("folds regardless of which side is shorter", () => {
    expect(
      namesFoldByContainment("Cookers Bulk Oil System Pty Ltd", "Cookers"),
    ).toBe(true);
  });

  it("folds a bare brand into its expanded name", () => {
    expect(namesFoldByContainment("Sapori", "Sapori International")).toBe(true);
  });

  it("ignores legal suffixes on the shorter side too", () => {
    expect(
      namesFoldByContainment("Cookers Pty Ltd", "Cookers Bulk Oil System"),
    ).toBe(true);
  });

  it("does not fold the Food Art pair: shared words are not a leading match", () => {
    expect(
      namesFoldByContainment("Food Art Distribution", "FA2026 Pty Ltd T/A Food Art"),
    ).toBe(false);
  });

  it("does not fold genuinely different suppliers", () => {
    expect(namesFoldByContainment("Bidfood", "PFD Food Services")).toBe(false);
    expect(namesFoldByContainment("Cookers", "Cook Industries")).toBe(false);
  });

  it("requires whole tokens, not substrings", () => {
    expect(namesFoldByContainment("Cooker", "Cookers Bulk Oil System")).toBe(false);
  });

  it("refuses to fold names shorter than five characters", () => {
    expect(namesFoldByContainment("Acme", "Acme Distribution")).toBe(false);
  });

  it("handles empty names without folding", () => {
    expect(namesFoldByContainment("", "Cookers")).toBe(false);
    expect(namesFoldByContainment(null, "Cookers")).toBe(false);
  });
});

describe("findNameContainmentMatch", () => {
  const cookers = { id: "s1", name: "Cookers Bulk Oil System Pty Ltd" };
  const sapori = { id: "s2", name: "Sapori International" };

  it("returns the single supplier the candidate folds into", () => {
    expect(findNameContainmentMatch("Cookers", [cookers, sapori])).toBe(cookers);
  });

  it("returns null when nothing folds", () => {
    expect(findNameContainmentMatch("Bidfood", [cookers, sapori])).toBeNull();
  });

  it("returns null when the fold is ambiguous", () => {
    const other = { id: "s3", name: "Cookers Melbourne" };
    expect(findNameContainmentMatch("Cookers", [cookers, other])).toBeNull();
  });
});

describe("decideSupplierIdentity", () => {
  const cookers = { id: "sup-1", name: "Cookers Bulk Oil System Pty Ltd" };
  const base = {
    invoiceSupplierName: null,
    byAbn: new Map([["56689549022", cookers]]),
    byName: new Map([["cookers bulk oil system pty ltd", cookers]]),
    knownSuppliers: [cookers],
  };

  it("still matches a zero-line docket by ABN", () => {
    const decision = decideSupplierIdentity({
      ...base,
      header: { name: "Cookers Bulk Oil", abn: "56 689 549 022" },
      lineItemCount: 0,
    });
    expect(decision).toEqual({ kind: "matched", via: "abn", supplier: cookers });
  });

  it("still matches a zero-line docket by exact name", () => {
    const decision = decideSupplierIdentity({
      ...base,
      header: { name: "Cookers Bulk Oil System Pty Ltd", abn: null },
      lineItemCount: 0,
    });
    expect(decision).toEqual({ kind: "matched", via: "name", supplier: cookers });
  });

  it("still folds a zero-line docket by name containment", () => {
    const decision = decideSupplierIdentity({
      ...base,
      header: { name: "Cookers", abn: null },
      lineItemCount: 0,
    });
    expect(decision).toEqual({
      kind: "matched",
      via: "name_containment",
      supplier: cookers,
    });
  });

  it("never mints from a zero-line docket, even with a fresh name", () => {
    const decision = decideSupplierIdentity({
      ...base,
      header: { name: "Brand New Foods", abn: null },
      lineItemCount: 0,
    });
    expect(decision).toEqual({ kind: "skip" });
  });

  it("mints from a bill that carries lines and an unknown name", () => {
    const decision = decideSupplierIdentity({
      ...base,
      header: { name: "  Brand New Foods  ", abn: "11 222 333 444" },
      lineItemCount: 12,
    });
    expect(decision).toEqual({
      kind: "create",
      name: "Brand New Foods",
      abn: "11 222 333 444",
    });
  });

  it("mints with a null ABN when the header carries a partial read", () => {
    // The live Food Art case: 8 digits read off a 11-digit ABN. The name
    // does not fold against the real supplier either (token order differs),
    // so a new supplier is minted, but the garbage ABN must not travel.
    const foodArt = { id: "sup-2", name: "FA2026 Pty Ltd T/A Food Art" };
    const decision = decideSupplierIdentity({
      invoiceSupplierName: null,
      byAbn: new Map([["56689549022", foodArt]]),
      byName: new Map([["fa2026 pty ltd t/a food art", foodArt]]),
      knownSuppliers: [foodArt],
      header: { name: "Food Art Distribution", abn: "68954902" },
      lineItemCount: 7,
    });
    expect(decision).toEqual({
      kind: "create",
      name: "Food Art Distribution",
      abn: null,
    });
  });

  it("falls back to the Xero contact name when the header has none", () => {
    const decision = decideSupplierIdentity({
      ...base,
      invoiceSupplierName: "Cookers",
      header: { name: null, abn: null },
      lineItemCount: 0,
    });
    expect(decision).toEqual({
      kind: "matched",
      via: "name_containment",
      supplier: cookers,
    });
  });

  it("skips when there is no name at all", () => {
    const decision = decideSupplierIdentity({
      ...base,
      header: { name: null, abn: null },
      lineItemCount: 5,
    });
    expect(decision).toEqual({ kind: "skip" });
  });
});
