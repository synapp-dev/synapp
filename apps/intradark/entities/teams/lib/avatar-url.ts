import { intradarkMediaPublicUrl } from "@/lib/media/public-media-url";

/** Resolve stored `teams.avatar` (object path or legacy URL) to a public image URL. */
export function resolveTeamAvatarUrl(avatar: string | null | undefined): string | null {
  const value = avatar?.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return intradarkMediaPublicUrl(value);
}
