/**
 * Allow only same-origin relative paths to prevent open redirects after OAuth.
 */
export function safeRelativeNextPath(next: string | null | undefined): string | null {
  if (next == null || next === "") return null;
  let trimmed = next.trim();
  if (trimmed.startsWith("%2F") || trimmed.startsWith("%2f")) {
    try {
      trimmed = decodeURIComponent(trimmed);
    } catch {
      return null;
    }
  }
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\") || /[\s\r\n]/.test(trimmed)) return null;
  if (trimmed.includes(":")) return null;
  return trimmed;
}
