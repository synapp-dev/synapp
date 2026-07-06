import { isUuid } from "@/lib/is-uuid";
import type {
  ResolvedSchoolRef,
  SchoolId,
  SchoolRefInput,
} from "@/types/school";
import { schoolRepo } from "./school.repo";

/**
 * Resolve ambiguous school input (slug or UUID) to `{ id, slug }`.
 * Returns null when the school does not exist.
 */
export async function resolveSchoolRef(
  input: SchoolRefInput
): Promise<ResolvedSchoolRef | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isUuid(trimmed)) {
    const rows = await schoolRepo.getByIds([trimmed]);
    const school = rows[0];
    if (!school?.id) return null;
    return {
      id: school.id,
      slug: school.slug ?? trimmed,
    };
  }

  const rows = await schoolRepo.getBySlug(trimmed);
  const school = rows[0];
  if (!school?.id) return null;
  return {
    id: school.id,
    slug: school.slug ?? trimmed,
  };
}

/** Resolve to school UUID only. Returns null when the school does not exist. */
export async function resolveSchoolId(
  input: SchoolRefInput
): Promise<SchoolId | null> {
  const ref = await resolveSchoolRef(input);
  return ref?.id ?? null;
}
