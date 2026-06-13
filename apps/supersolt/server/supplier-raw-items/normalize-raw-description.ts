/** Normalise supplier invoice wording for dedupe keys. */
export function normalizeRawDescription(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function buildRawItemDedupeKey(supplierId: string, rawDescription: string): string {
  return `${supplierId}:${normalizeRawDescription(rawDescription)}`;
}
