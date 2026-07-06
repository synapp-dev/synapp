/** Format school level badges for admin school detail views. */
export function formatSchoolLevel(
  levels: string[] | null | undefined
): string {
  if (!levels || levels.length === 0) {
    return "—";
  }

  const normalizedLevels = levels
    .filter(
      (level): level is string => typeof level === "string" && level != null
    )
    .map((level) => level.toLowerCase().trim())
    .filter((level) => level.length > 0);

  if (normalizedLevels.length === 0) {
    return "—";
  }

  const hasPrimary = normalizedLevels.some(
    (level) => level === "primary" || level.includes("primary")
  );
  const hasSecondary = normalizedLevels.some(
    (level) => level === "secondary" || level.includes("secondary")
  );

  if (hasPrimary && hasSecondary) {
    return "P-12";
  }
  if (hasPrimary) {
    return "Primary";
  }
  if (hasSecondary) {
    return "Secondary";
  }

  const firstLevel = normalizedLevels[0];
  return firstLevel
    ? firstLevel.charAt(0).toUpperCase() + firstLevel.slice(1).toLowerCase()
    : "—";
}
