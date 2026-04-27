export function formatTeacherName(
  first: string | null,
  last: string | null
): string {
  const n = [first, last].filter(Boolean).join(" ").trim();
  return n || "—";
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function pathWithSchool(base: string, schoolId: string): string {
  return schoolId
    ? `${base}?schoolId=${encodeURIComponent(schoolId)}`
    : base;
}
