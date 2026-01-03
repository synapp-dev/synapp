/**
 * Capitalizes a school name to Title Case
 * Capitalizes the first letter of each word while preserving spaces
 * Examples:
 *   "st mary's school" -> "St Mary's School"
 *   "john smith high" -> "John Smith High"
 *   "MC DONALD HIGH" -> "Mc Donald High"
 */
export function capitalizeSchoolName(name: string): string {
  if (!name || typeof name !== "string") {
    return name;
  }

  // Trim whitespace and split by spaces
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
