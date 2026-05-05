/** Discord voice channel names: lowercase alphanumerics and hyphens, max 100. */
export function sanitizeDiscordChannelName(raw: string, fallback: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return s.length > 0 ? s : fallback;
}
