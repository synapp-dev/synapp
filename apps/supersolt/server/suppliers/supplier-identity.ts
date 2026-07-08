/**
 * Supplier identity resolution for invoice-driven imports.
 *
 * Invoice headers are noisy: the same supplier appears as "Cookers" on a
 * delivery docket and "Cookers Bulk Oil System Pty Ltd" on a tax invoice,
 * and OCR sometimes reads back only part of an ABN. Everything here is pure
 * so the fold/mint rules stay unit-testable away from the DB.
 */

/** ABNs arrive formatted ("11 222 333 444"); identity compares digits only. */
export function abnKey(abn: string | null | undefined): string | null {
  const digits = (abn ?? "").replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

export function nameKey(name: string | null | undefined): string | null {
  const normalized = (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

/** Trailing legal-form words that carry no identity ("Pty Ltd", "Unit Trust"). */
const LEGAL_SUFFIX_TOKENS = new Set([
  "pty",
  "ltd",
  "limited",
  "proprietary",
  "inc",
  "incorporated",
  "co",
  "unit",
  "trust",
]);

/**
 * Shortest normalized name (letters and digits, spaces excluded) allowed to
 * fold by containment: "cookers" and "sapori" qualify, initials do not.
 */
const MIN_FOLD_CHARS = 5;

/**
 * Identity tokens of a supplier name: lowercased, punctuation collapsed to
 * spaces, any "t/a ..." / "trading as ..." clause dropped (it names an alias,
 * not the entity), trailing legal suffixes stripped.
 */
export function normalizedNameTokens(name: string | null | undefined): string[] {
  let s = (name ?? "").toLowerCase();
  s = s.replace(/\b(?:t\/as?|trading as)\b[\s\S]*$/, " ");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  if (!s) return [];
  const tokens = s.split(" ");
  while (tokens.length > 1 && LEGAL_SUFFIX_TOKENS.has(tokens[tokens.length - 1] ?? "")) {
    tokens.pop();
  }
  return tokens;
}

/**
 * Same-supplier test for two name variants: after normalization the shorter
 * name must be a whole-token prefix of the longer ("cookers" folds into
 * "cookers bulk oil system") and long enough to be distinctive. Deliberately
 * conservative: shared words elsewhere in the name never fold, so
 * "Food Art Distribution" stays apart from "FA2026 Pty Ltd T/A Food Art".
 */
export function namesFoldByContainment(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const tokensA = normalizedNameTokens(a);
  const tokensB = normalizedNameTokens(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  const [short, long] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  if (short.join("").length < MIN_FOLD_CHARS) return false;
  return short.every((token, i) => long[i] === token);
}

export type SupplierRef = { id: string; name: string };

/**
 * The one existing supplier the candidate name folds into, or null when none
 * or more than one does. An ambiguous fold matches nothing and mints nothing;
 * a human sorts that pair out in triage.
 */
export function findNameContainmentMatch<T extends SupplierRef>(
  candidateName: string,
  suppliers: readonly T[],
): T | null {
  let match: T | null = null;
  for (const supplier of suppliers) {
    if (!namesFoldByContainment(candidateName, supplier.name)) continue;
    if (match && match.id !== supplier.id) return null;
    match = supplier;
  }
  return match;
}

export type SupplierIdentityDecision =
  | { kind: "matched"; via: "abn" | "name" | "name_containment"; supplier: SupplierRef }
  | { kind: "create"; name: string; abn: string | null }
  | { kind: "skip" };

/**
 * Pure resolve-or-mint policy for one parsed bill header. Matching is
 * generous (ABN, exact name, then whole-token name containment); minting is
 * strict: a bill with zero extracted lines is a docket/statement whose header
 * can't be trusted to mint identity, and an ABN that doesn't normalize to 11
 * digits is a partial read that must never be persisted.
 */
export function decideSupplierIdentity(args: {
  header: { name: string | null; abn: string | null };
  invoiceSupplierName: string | null;
  lineItemCount: number;
  byAbn: ReadonlyMap<string, SupplierRef>;
  byName: ReadonlyMap<string, SupplierRef>;
  knownSuppliers: readonly SupplierRef[];
}): SupplierIdentityDecision {
  const abn = abnKey(args.header.abn);
  if (abn) {
    const hit = args.byAbn.get(abn);
    if (hit) return { kind: "matched", via: "abn", supplier: hit };
  }

  const candidateName = args.header.name ?? args.invoiceSupplierName;
  const name = nameKey(candidateName);
  if (name) {
    const hit = args.byName.get(name);
    if (hit) return { kind: "matched", via: "name", supplier: hit };
  }
  if (!candidateName?.trim()) return { kind: "skip" };

  const folded = findNameContainmentMatch(candidateName, args.knownSuppliers);
  if (folded) {
    return {
      kind: "matched",
      via: "name_containment",
      supplier: { id: folded.id, name: folded.name },
    };
  }

  if (args.lineItemCount === 0) return { kind: "skip" };

  return {
    kind: "create",
    name: candidateName.trim(),
    abn: abn ? args.header.abn : null,
  };
}
