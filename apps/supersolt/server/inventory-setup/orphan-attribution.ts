/**
 * Pure helpers for the orphan-bill attribution queue (the un-foldable remainder
 * of {@link foldOrphanBillsByAccount}). When a placeholder supplier ("No Contact")
 * can't be folded into a single real supplier by account code, its PDF-bearing
 * bills surface here so the user can attribute them — pre-filled from the
 * invoice PDF's header identity (name / ABN / email).
 *
 * Kept dependency-free so the classification + matching logic is unit-testable
 * without Xero or the database.
 */

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const digits = (value: string) => value.replace(/\D/g, "");

export type PlaceholderClassification = {
  /** Placeholder folds into exactly one real supplier (handled by the fold). */
  foldable: Array<{ placeholderId: string; toSupplierId: string }>;
  /** Placeholder points at zero or many real suppliers — needs manual attribution. */
  unfoldable: string[];
};

/**
 * Split placeholder suppliers into the foldable ones (every account they use
 * points at the SAME single real supplier) and the un-foldable remainder
 * (ambiguous: zero or multiple candidate owners). Mirrors the fold rule so both
 * paths agree on what's foldable.
 */
export function classifyPlaceholders(args: {
  placeholderIds: Iterable<string>;
  /** supplierId → account codes seen on its bills. */
  ownerAccounts: Map<string, Set<string>>;
  /** account code → supplierIds that use it. */
  accountOwners: Map<string, Set<string>>;
  isPlaceholder: (supplierId: string) => boolean;
}): PlaceholderClassification {
  const foldable: PlaceholderClassification["foldable"] = [];
  const unfoldable: string[] = [];

  for (const placeholderId of args.placeholderIds) {
    const accts = args.ownerAccounts.get(placeholderId);
    if (!accts || accts.size === 0) {
      // No coded bills at all → can't fold by account; needs manual attribution.
      unfoldable.push(placeholderId);
      continue;
    }
    const targets = new Set<string>();
    for (const code of accts) {
      for (const owner of args.accountOwners.get(code) ?? []) {
        if (owner === placeholderId || args.isPlaceholder(owner)) continue;
        targets.add(owner);
      }
    }
    if (targets.size === 1) {
      foldable.push({ placeholderId, toSupplierId: [...targets][0]! });
    } else {
      unfoldable.push(placeholderId);
    }
  }

  return { foldable, unfoldable };
}

export type SupplierIdentity = {
  name?: string | null;
  abn?: string | null;
  email?: string | null;
};

export type MatchCandidate = {
  id: string;
  name: string;
  abn?: string | null;
  email?: string | null;
};

export type OrphanMatch =
  | { kind: "existing"; supplierId: string; reason: string }
  | { kind: "create"; suggestedName: string | null; reason: string };

/**
 * Suggest who an orphan bill belongs to from its PDF-header identity. Prefers
 * the strongest unique signal: exact ABN, then exact email, then an exact
 * normalised name. Anything weaker → suggest creating a new supplier (so we
 * never silently mis-attribute on a fuzzy guess). A signal that matches MORE
 * than one existing supplier is treated as ambiguous and skipped.
 */
export function suggestSupplierMatch(
  identity: SupplierIdentity,
  candidates: MatchCandidate[],
): OrphanMatch {
  const uniqueBy = <T>(
    list: MatchCandidate[],
    pick: (c: MatchCandidate) => T | null | undefined,
    want: T,
  ): MatchCandidate | "ambiguous" | null => {
    const hits = list.filter((c) => {
      const v = pick(c);
      return v != null && v === want;
    });
    if (hits.length === 1) return hits[0]!;
    if (hits.length > 1) return "ambiguous";
    return null;
  };

  const abn = identity.abn ? digits(identity.abn) : "";
  if (abn.length > 0) {
    const hit = uniqueBy(candidates, (c) => (c.abn ? digits(c.abn) : null), abn);
    if (hit && hit !== "ambiguous") {
      return { kind: "existing", supplierId: hit.id, reason: "Matched by ABN" };
    }
  }

  const email = identity.email ? norm(identity.email) : "";
  if (email.length > 0) {
    const hit = uniqueBy(candidates, (c) => (c.email ? norm(c.email) : null), email);
    if (hit && hit !== "ambiguous") {
      return { kind: "existing", supplierId: hit.id, reason: "Matched by email" };
    }
  }

  const name = identity.name ? norm(identity.name) : "";
  if (name.length > 0) {
    const hit = uniqueBy(candidates, (c) => norm(c.name), name);
    if (hit && hit !== "ambiguous") {
      return { kind: "existing", supplierId: hit.id, reason: "Matched by name" };
    }
  }

  return {
    kind: "create",
    suggestedName: identity.name?.trim() || null,
    reason: "No confident match — create a new supplier",
  };
}
