import { describe, expect, it } from "vitest";
import {
  classifyPlaceholders,
  suggestSupplierMatch,
  type MatchCandidate,
} from "./orphan-attribution";

const placeholder = new Set(["ph1", "ph2"]);
const isPlaceholder = (id: string) => placeholder.has(id);

describe("classifyPlaceholders", () => {
  it("folds a placeholder whose accounts all point at one real supplier", () => {
    const result = classifyPlaceholders({
      placeholderIds: ["ph1"],
      ownerAccounts: new Map([["ph1", new Set(["200", "201"])]]),
      accountOwners: new Map([
        ["200", new Set(["ph1", "real-a"])],
        ["201", new Set(["ph1", "real-a"])],
      ]),
      isPlaceholder,
    });
    expect(result.foldable).toEqual([{ placeholderId: "ph1", toSupplierId: "real-a" }]);
    expect(result.unfoldable).toEqual([]);
  });

  it("marks a placeholder ambiguous when accounts point at multiple suppliers", () => {
    const result = classifyPlaceholders({
      placeholderIds: ["ph1"],
      ownerAccounts: new Map([["ph1", new Set(["200", "300"])]]),
      accountOwners: new Map([
        ["200", new Set(["ph1", "real-a"])],
        ["300", new Set(["ph1", "real-b"])],
      ]),
      isPlaceholder,
    });
    expect(result.foldable).toEqual([]);
    expect(result.unfoldable).toEqual(["ph1"]);
  });

  it("treats a placeholder with no coded bills as un-foldable", () => {
    const result = classifyPlaceholders({
      placeholderIds: ["ph2"],
      ownerAccounts: new Map(),
      accountOwners: new Map(),
      isPlaceholder,
    });
    expect(result.unfoldable).toEqual(["ph2"]);
  });

  it("ignores other placeholders as fold targets", () => {
    const result = classifyPlaceholders({
      placeholderIds: ["ph1"],
      ownerAccounts: new Map([["ph1", new Set(["200"])]]),
      // Account 200 used by ph1 and ph2 (both placeholders) — no real owner.
      accountOwners: new Map([["200", new Set(["ph1", "ph2"])]]),
      isPlaceholder,
    });
    expect(result.foldable).toEqual([]);
    expect(result.unfoldable).toEqual(["ph1"]);
  });
});

describe("suggestSupplierMatch", () => {
  const candidates: MatchCandidate[] = [
    { id: "a", name: "Rustica Sourdough", abn: "11 222 333 444", email: "orders@rustica.com" },
    { id: "b", name: "JR Group", abn: "55666777888", email: "ap@jrgroup.com.au" },
  ];

  it("matches by ABN regardless of formatting", () => {
    const m = suggestSupplierMatch({ abn: "11222333444" }, candidates);
    expect(m).toEqual({ kind: "existing", supplierId: "a", reason: "Matched by ABN" });
  });

  it("matches by email when ABN is absent", () => {
    const m = suggestSupplierMatch({ email: "AP@jrgroup.com.au" }, candidates);
    expect(m).toEqual({ kind: "existing", supplierId: "b", reason: "Matched by email" });
  });

  it("matches by exact normalised name as a last resort", () => {
    const m = suggestSupplierMatch({ name: "  rustica   sourdough " }, candidates);
    expect(m).toEqual({ kind: "existing", supplierId: "a", reason: "Matched by name" });
  });

  it("suggests creating a new supplier when nothing matches", () => {
    const m = suggestSupplierMatch({ name: "Bayside Greens", abn: "99999999999" }, candidates);
    expect(m).toEqual({
      kind: "create",
      suggestedName: "Bayside Greens",
      reason: "No confident match — create a new supplier",
    });
  });

  it("does not match on an ambiguous signal shared by two suppliers", () => {
    const dupes: MatchCandidate[] = [
      { id: "a", name: "Acme", email: "shared@x.com" },
      { id: "b", name: "Beta", email: "shared@x.com" },
    ];
    const m = suggestSupplierMatch({ email: "shared@x.com" }, dupes);
    expect(m.kind).toBe("create");
  });
});
