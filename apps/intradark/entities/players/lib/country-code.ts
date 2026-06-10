/** Normalize upstream country codes to ISO 3166-1 alpha-2 for country-flag-icons. */
export function normalizeCountryCode(
  code: string | null | undefined,
): string | null {
  if (!code || typeof code !== "string") return null;
  const trimmed = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : null;
}
