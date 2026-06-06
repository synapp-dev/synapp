import { ROLE_DEVELOPER } from "@/entities/admin/lib/rbac-constants";

/**
 * True when effective slugs include `required`, or include `developer` (implies all capabilities).
 */
export function hasCapability(
  effectiveSlugs: readonly string[],
  required: string,
): boolean {
  if (effectiveSlugs.includes(ROLE_DEVELOPER)) return true;
  return effectiveSlugs.includes(required);
}
