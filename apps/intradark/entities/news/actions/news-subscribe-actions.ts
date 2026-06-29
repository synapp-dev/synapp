"use server";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { db } from "@/server/db/drizzle";
import { steamNotificationPrefs } from "@/server/db/schema";

export type SetNewsSubscriptionResult =
  | { ok: true; subscribed: boolean }
  | { ok: false; message: string };

/**
 * Toggle the viewer's Steam news subscription (steam_notification_prefs.notify_news).
 * Upserts the prefs row so the choice persists even before the bot is added.
 */
export async function setNewsSubscriptionAction(
  enabled: boolean,
): Promise<SetNewsSubscriptionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, message: "Sign in to subscribe." };
  }

  const now = new Date().toISOString();
  try {
    await db
      .insert(steamNotificationPrefs)
      .values({ userId, notifyNews: enabled, updatedAt: now })
      .onConflictDoUpdate({
        target: steamNotificationPrefs.userId,
        set: { notifyNews: enabled, updatedAt: now },
      });
    return { ok: true, subscribed: enabled };
  } catch (err) {
    console.error("[news-subscribe] setNewsSubscriptionAction", err);
    return { ok: false, message: "Couldn't update your subscription." };
  }
}
