const SLUG_MAX = 48;

export function slugifyBase(input: string): string {
  const raw = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const base = raw.slice(0, SLUG_MAX) || "org";
  return base;
}
