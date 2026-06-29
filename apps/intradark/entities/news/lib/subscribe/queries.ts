import { and, eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  steamFriends,
  steamNotificationPrefs,
  userProfiles,
} from "@/server/db/schema";

export type NewsSubscriptionState = {
  signedIn: boolean;
  /** Steam account linked (required to receive DMs at all). */
  steamLinked: boolean;
  /** Bot added as a Steam friend (required for DMs to actually land). */
  botAdded: boolean;
  /** notify_news pref (defaults true when no row). */
  subscribed: boolean;
};

const SIGNED_OUT: NewsSubscriptionState = {
  signedIn: false,
  steamLinked: false,
  botAdded: false,
  subscribed: false,
};

/** Resolve the viewer's Steam-news subscription state for the subscribe card. */
export async function getNewsSubscriptionState(
  userId: string | null,
): Promise<NewsSubscriptionState> {
  if (!userId) return SIGNED_OUT;

  const [profile, friend, prefs] = await Promise.all([
    db
      .select({ steamProfileId: userProfiles.steamProfileId })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1),
    db
      .select({ userId: steamFriends.userId })
      .from(steamFriends)
      .where(
        and(
          eq(steamFriends.userId, userId),
          eq(steamFriends.friendStatus, "active"),
        ),
      )
      .limit(1),
    db
      .select({ notifyNews: steamNotificationPrefs.notifyNews })
      .from(steamNotificationPrefs)
      .where(eq(steamNotificationPrefs.userId, userId))
      .limit(1),
  ]);

  return {
    signedIn: true,
    steamLinked: profile[0]?.steamProfileId != null,
    botAdded: friend.length > 0,
    subscribed: prefs[0]?.notifyNews ?? true,
  };
}
