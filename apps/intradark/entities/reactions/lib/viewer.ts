import type { CurrentUserProfiles } from "@/lib/get-current-user-profiles";

import type { ReactionAuthor } from "./types";

/**
 * Build the viewer's {@link ReactionAuthor} from their loaded profiles, for
 * optimistic reaction inserts (so their name shows in the summary instantly,
 * before the server round-trip returns the authoritative list).
 */
export function viewerAuthorFromProfiles(
  profiles: CurrentUserProfiles | null,
): ReactionAuthor | null {
  if (!profiles) return null;
  const { user, userProfile, steamProfile } = profiles;
  return {
    userId: user.id,
    username: userProfile.username ?? null,
    displayName: userProfile.display_name ?? null,
    avatarUrl: steamProfile?.avatarfull ?? userProfile.avatar_url ?? null,
    countryFlag: null,
    steamid64: userProfile.steam_profile_id ?? null,
  };
}
