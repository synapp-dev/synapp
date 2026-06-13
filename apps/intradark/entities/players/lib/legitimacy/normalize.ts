export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function clamp100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Account age in years → 0–1 with sqrt diminishing returns (cap 10yr). */
export function normalizeAccountAgeYears(years: number): number {
  return clamp01(Math.sqrt(Math.max(0, years)) / Math.sqrt(10));
}

export function accountAgeYearsFromIso(iso: string | null | undefined): number {
  if (!iso) return 0;
  const created = Date.parse(iso);
  if (Number.isNaN(created)) return 0;
  const ms = Date.now() - created;
  return Math.max(0, ms / (365.25 * 24 * 60 * 60 * 1000));
}

/** Count metrics (friends, hours, matches) — log scale toward a cap. */
export function normalizeCountLog(value: number, cap: number): number {
  if (value <= 0 || cap <= 0) return 0;
  return clamp01(Math.log1p(value) / Math.log1p(cap));
}

/** Leetify-style fraction or percent → 0–1 skill contribution. */
export function normalizeLeetifyFraction(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  const abs = Math.abs(value);
  const fraction = abs < 0.25 ? abs : abs / 100;
  return clamp01(fraction / 0.05);
}

/** FACEIT elo 0–5000+ → 0–1. */
export function normalizeFaceitElo(elo: number | null | undefined): number {
  if (elo == null || !Number.isFinite(elo)) return 0;
  return clamp01(elo / 4000);
}

/** Premier rating ~5k–30k → 0–1. */
export function normalizePremierRating(rating: number | null | undefined): number {
  if (rating == null || !Number.isFinite(rating)) return 0;
  return clamp01((rating - 5000) / 25000);
}

export function toAxisScore(fraction: number): number {
  return Math.round(clamp100(fraction * 100));
}
