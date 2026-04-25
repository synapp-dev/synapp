/**
 * Allow only same-origin relative paths to prevent open redirects after OAuth.
 */
export function safeRelativeNextPath(next: string | null | undefined): string | null {
  if (next == null || next === "") return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\") || /[\s\r\n]/.test(trimmed)) return null;
  if (trimmed.includes(":")) return null;
  return trimmed;
}
