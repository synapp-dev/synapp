import type { StageLessonRatingRow } from "@/entities/ratings/api/endpoints";

export const ALL_SCHOOLS = "__all__";

export function teacherDisplayName(row: StageLessonRatingRow): string {
  const first = row.teacherFirstName?.trim() ?? "";
  const last = row.teacherLastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || row.teacherEmail || "Unknown teacher";
}

function rowSearchHaystack(row: StageLessonRatingRow): string {
  return [
    teacherDisplayName(row),
    row.teacherEmail ?? "",
    row.schoolName,
    row.comments ?? "",
    ...(row.classNames ?? []),
    String(row.rating),
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesSearchQuery(
  row: StageLessonRatingRow,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = rowSearchHaystack(row);
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}

export function buildSchoolOptions(
  rows: StageLessonRatingRow[]
): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  rows.forEach((r) => {
    if (r.schoolId && !byId.has(r.schoolId)) {
      byId.set(r.schoolId, r.schoolName || r.schoolId);
    }
  });
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export function filterTopicRows(
  rows: StageLessonRatingRow[],
  schoolFilter: string,
  searchQuery: string
): StageLessonRatingRow[] {
  return rows.filter((r) => {
    if (schoolFilter !== ALL_SCHOOLS && r.schoolId !== schoolFilter) {
      return false;
    }
    if (!matchesSearchQuery(r, searchQuery)) {
      return false;
    }
    return true;
  });
}
