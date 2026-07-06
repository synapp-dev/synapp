/** Canonical year-level order for lesson lists (Glenn: ½, ¾, … 10, 11, 12). */
const YEAR_CODE_ORDER: Record<string, number> = {
  "1/2": 0,
  "½": 0,
  "3/4": 1,
  "¾": 1,
  "1": 2,
  "2": 3,
  "3": 4,
  "4": 5,
  "5": 6,
  "6": 7,
  "7": 8,
  "8": 9,
  "9": 10,
  "10": 11,
  "11": 12,
  "12": 13,
};

function normalizeYearCode(code: string): string {
  return code.trim().replace("1/2", "½").replace("3/4", "¾");
}

/** Lower sort index = earlier in curriculum year order. */
export function getYearCodeSortIndex(code: string): number {
  const normalized = normalizeYearCode(code);
  if (normalized in YEAR_CODE_ORDER) {
    return YEAR_CODE_ORDER[normalized]!;
  }
  const composite = normalized.match(/^(\d+)\/(\d+)$/);
  if (composite) {
    const low = parseInt(composite[1]!, 10);
    return low + 1;
  }
  const numeric = parseInt(normalized, 10);
  if (!Number.isNaN(numeric)) {
    return numeric + 1;
  }
  return 999;
}

export function sortYearCodes(codes: string[]): string[] {
  return [...codes].sort((a, b) => getYearCodeSortIndex(a) - getYearCodeSortIndex(b));
}

export function getMinYearCodeSortIndex(codes: string[]): number {
  if (codes.length === 0) return 999;
  return Math.min(...codes.map(getYearCodeSortIndex));
}
