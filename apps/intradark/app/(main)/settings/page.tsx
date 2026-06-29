import { redirect } from "next/navigation";

import { getAcStatus } from "@/entities/anticheat/actions";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { createServerClient } from "@/utils/supabase/server";

import { AnticheatCard } from "./anticheat-card";
import { NotificationSettings } from "./notification-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await getCurrentUserProfiles();
  if (!me) redirect("/");

  const steamid64 = me.userProfile.steam_profile_id;
  let initialPrefs: Record<string, boolean> | null = null;
  let connected = false;

  if (steamid64) {
    const supabase = await createServerClient();
    const [{ data: prefs }, { data: friend }] = await Promise.all([
      supabase
        .from("steam_notification_prefs")
        .select("notify_match, notify_news, notify_scrim, notify_broadcast")
        .eq("user_id", me.user.id)
        .maybeSingle(),
      supabase
        .from("steam_friends")
        .select("friend_status")
        .eq("user_id", me.user.id)
        .maybeSingle(),
    ]);
    initialPrefs = (prefs as Record<string, boolean> | null) ?? null;
    connected =
      (friend as { friend_status: string } | null)?.friend_status === "active";
  }

  const acStatus = await getAcStatus();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage the notifications the Intradark Steam bot sends you.
        </p>
      </div>
      <NotificationSettings
        userId={me.user.id}
        steamLinked={Boolean(steamid64)}
        connected={connected}
        initialPrefs={initialPrefs}
        botProfileUrl={process.env.NEXT_PUBLIC_STEAM_FRIENDS_BOT_PROFILE_URL ?? null}
      />
      <AnticheatCard
        steamLinked={Boolean(steamid64)}
        status={acStatus}
        downloadUrl={process.env.NEXT_PUBLIC_AC_DOWNLOAD_URL ?? null}
      />
    </div>
  );
}
