import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";
import type { PushMessage } from "@/entities/notifications/model/types";

let configured = false;

/** Configure web-push with VAPID details once per server process. */
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Send a push message to every device the user has subscribed. Stale endpoints
 * (404/410 from the push service) are pruned. Returns how many were delivered.
 */
export async function sendPushToUser(
  userId: string,
  message: PushMessage
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) return { sent: 0, removed: 0 };

  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  const subscriptions = (data as SubscriptionRow[] | null) ?? [];
  if (subscriptions.length === 0) return { sent: 0, removed: 0 };

  const payload = JSON.stringify(message);
  const staleIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload
        );
        sent += 1;
      } catch (err) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        // 404/410 mean the subscription is dead — drop it.
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(row.id);
        } else {
          console.warn("[push] send failed:", statusCode ?? err);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  // Touch last_used_at on the surviving rows so we can spot dormant devices.
  if (sent > 0) {
    const liveIds = subscriptions
      .filter((row) => !staleIds.includes(row.id))
      .map((row) => row.id);
    await admin
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .in("id", liveIds);
  }

  return { sent, removed: staleIds.length };
}
