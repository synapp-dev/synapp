/**
 * Clusters a supplier's raw items into review "products" for the wizard's
 * item-approval flow. Two jobs:
 *  1. Parse pack/size tokens out of each description (`5kg`, `1.9kg (6)`,
 *     `1lt x 8`) so the leftover "core name" can be matched and the pack sizes
 *     surfaced.
 *  2. Cluster items whose core names are the same product — including typos
 *     (PISTACHIO ↔ PISTACCHIO) and pk/unit splits — while keeping genuinely
 *     different products apart (MILK SOY vs MILK OAT).
 *
 * Pure functions only — no DB access — so the grouping is testable and the
 * service can layer price history on top.
 */

export type ClusterableRawItem = {
  id: string;
  rawDescription: string;
  rawDescriptionNormalized: string;
  rawUnit: string | null;
  rawUnitNormalized: string;
  lastUnitPriceCents: number | null;
  lastSeenAt: string;
  isLikelyInventory: boolean | null;
  reviewedAt: string | null;
};

export type ReviewPack = {
  key: string;
  label: string;
  unitsPerPack: number;
  packUnit: string;
  magnitude: number | null;
  uom: string | null;
  packCount: number | null;
  rawItemIds: string[];
  currentPriceCents: number | null;
};

export type ReviewCluster = {
  key: string;
  canonicalName: string;
  aliases: string[];
  rawItemIds: string[];
  /** Normalised descriptions of every member — used to bucket price lines. */
  memberNormalizedDescriptions: string[];
  isLikelyInventory: boolean;
  reviewed: boolean;
  currentPriceCents: number | null;
  packs: ReviewPack[];
};

// Canonical units of measure — collapse the wording variants the parser sees.
const UOM_CANON: Record<string, string> = {
  kg: "kg",
  kgs: "kg",
  g: "g",
  gm: "g",
  gram: "g",
  grams: "g",
  l: "lt",
  lt: "lt",
  ltr: "lt",
  litre: "lt",
  litres: "lt",
  liter: "lt",
  ml: "ml",
  ea: "each",
  each: "each",
  pk: "pack",
  pkt: "pack",
  pack: "pack",
  packet: "pack",
  doz: "dozen",
  dozen: "dozen",
  pc: "piece",
  pcs: "piece",
  piece: "piece",
  pieces: "piece",
};

const UOM_PATTERN = Object.keys(UOM_CANON).sort((a, b) => b.length - a.length).join("|");
const SIZE_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UOM_PATTERN})\\b`, "i");
const PACK_PAREN_RE = /\((\d+)\)/;
const PACK_X_AFTER_RE = /\bx\s*(\d+)\b/i;
const PACK_X_BEFORE_RE = /\b(\d+)\s*x\b/i;

export type ParsedPack = {
  coreName: string;
  coreTokens: string[];
  magnitude: number | null;
  uom: string | null;
  packCount: number | null;
};

export function parsePack(rawDescription: string): ParsedPack {
  // Drop origin/brand tags in braces and asterisk runs (`**** MILKLAB ****`).
  let working = rawDescription.replace(/\{[^}]*\}/g, " ").replace(/\*+/g, " ");

  const sizeMatch = working.match(SIZE_RE);
  const magnitude = sizeMatch ? Number.parseFloat(sizeMatch[1]!) : null;
  const uom = sizeMatch ? (UOM_CANON[sizeMatch[2]!.toLowerCase()] ?? null) : null;
  if (sizeMatch) working = working.replace(sizeMatch[0], " ");

  let packCount: number | null = null;
  const paren = working.match(PACK_PAREN_RE);
  const xAfter = working.match(PACK_X_AFTER_RE);
  const xBefore = working.match(PACK_X_BEFORE_RE);
  if (paren) {
    packCount = Number.parseInt(paren[1]!, 10);
    working = working.replace(paren[0], " ");
  } else if (xAfter) {
    packCount = Number.parseInt(xAfter[1]!, 10);
    working = working.replace(xAfter[0], " ");
  } else if (xBefore) {
    packCount = Number.parseInt(xBefore[1]!, 10);
    working = working.replace(xBefore[0], " ");
  }

  const coreName = working.replace(/\s+/g, " ").trim();
  const coreTokens = coreName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  return { coreName, coreTokens, magnitude, uom, packCount };
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

/**
 * Same product when the core names match token-for-token, allowing exactly one
 * token to differ by a small typo (≤20% of its length). Equal token count is
 * required so "milk soy" and "milk oat" — distinct products — never merge.
 */
function sameProduct(a: string[], b: string[]): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let typos = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const tokenA = a[i]!;
    const tokenB = b[i]!;
    const dist = levenshtein(tokenA, tokenB);
    const tolerance = Math.max(1, Math.floor(Math.max(tokenA.length, tokenB.length) * 0.2));
    if (dist > tolerance) return false;
    typos += 1;
    if (typos > 1) return false;
  }
  return true;
}

function packLabel(magnitude: number | null, uom: string | null, packCount: number | null): string {
  const size = magnitude != null ? `${magnitude}${uom ?? ""}` : null;
  if (size && packCount && packCount > 1) return `${size} × ${packCount}`;
  if (size) return size;
  if (packCount && packCount > 1) return `${packCount} pack`;
  return "each";
}

function packSignature(p: ParsedPack): string {
  return `${p.magnitude ?? ""}|${p.uom ?? ""}|${p.packCount ?? ""}`;
}

/**
 * Stable pack identity parsed from invoice wording — same signature means the
 * same physical pack (size + count), so two raw lines differing only in unit
 * wording ("box" vs "pack") or brand decoration are one pack, not two.
 */
export function packSignatureForDescription(rawDescription: string): string {
  return packSignature(parsePack(rawDescription));
}

type Member = { item: ClusterableRawItem; pack: ParsedPack };

function buildPacks(members: Member[]): ReviewPack[] {
  const bySig = new Map<string, Member[]>();
  for (const m of members) {
    const sig = packSignature(m.pack);
    const list = bySig.get(sig);
    if (list) list.push(m);
    else bySig.set(sig, [m]);
  }

  const packs: ReviewPack[] = [];
  for (const [sig, group] of bySig) {
    // Most recent observation in this pack wins the displayed price.
    const latest = [...group].sort((a, b) =>
      b.item.lastSeenAt.localeCompare(a.item.lastSeenAt),
    )[0]!;
    const { magnitude, uom, packCount } = latest.pack;
    packs.push({
      key: sig,
      label: packLabel(magnitude, uom, packCount),
      unitsPerPack: packCount ?? 1,
      packUnit: uom ?? latest.item.rawUnit ?? "each",
      magnitude,
      uom,
      packCount,
      rawItemIds: group.map((m) => m.item.id),
      currentPriceCents: latest.item.lastUnitPriceCents,
    });
  }
  // Biggest/most-packaged first is the usual default; sort by units then size.
  packs.sort((a, b) => (a.unitsPerPack - b.unitsPerPack) || ((a.magnitude ?? 0) - (b.magnitude ?? 0)));
  return packs;
}

/** Pack sizes inferred from an arbitrary set of raw items (one product's worth). */
export function packsForRawItems(items: ClusterableRawItem[]): ReviewPack[] {
  return buildPacks(items.map((item) => ({ item, pack: parsePack(item.rawDescription) })));
}

export function clusterRawItems(items: ClusterableRawItem[]): ReviewCluster[] {
  const parsed: Member[] = items.map((item) => ({ item, pack: parsePack(item.rawDescription) }));

  type Cluster = { repTokens: string[]; members: Member[] };
  const clusters: Cluster[] = [];
  for (const member of parsed) {
    const hit = clusters.find((c) => sameProduct(c.repTokens, member.pack.coreTokens));
    if (hit) {
      hit.members.push(member);
      // Keep the shortest core name as the representative.
      if (member.pack.coreTokens.length < hit.repTokens.length) {
        hit.repTokens = member.pack.coreTokens;
      }
    } else {
      clusters.push({ repTokens: member.pack.coreTokens, members: [member] });
    }
  }

  return clusters.map((cluster): ReviewCluster => {
    const representative = [...cluster.members].sort((a, b) => {
      const byTokens = a.pack.coreTokens.length - b.pack.coreTokens.length;
      if (byTokens !== 0) return byTokens;
      return a.pack.coreName.length - b.pack.coreName.length;
    })[0]!;

    const packs = buildPacks(cluster.members);
    const latestMember = [...cluster.members].sort((a, b) =>
      b.item.lastSeenAt.localeCompare(a.item.lastSeenAt),
    )[0]!;

    const aliases = [...new Set(cluster.members.map((m) => m.item.rawDescription))];

    return {
      key: representative.item.id,
      canonicalName: representative.pack.coreName || representative.item.rawDescription,
      aliases,
      rawItemIds: cluster.members.map((m) => m.item.id),
      memberNormalizedDescriptions: [
        ...new Set(cluster.members.map((m) => m.item.rawDescriptionNormalized)),
      ],
      isLikelyInventory: cluster.members.some((m) => m.item.isLikelyInventory !== false),
      reviewed: cluster.members.every((m) => m.item.reviewedAt != null),
      currentPriceCents: latestMember.item.lastUnitPriceCents,
      packs,
    };
  });
}
