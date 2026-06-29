import {
  countBroadcastRecipients,
  friendsBotHealth,
  listBotFriends,
} from "@/entities/notifications/lib/server/steam-dm";

import { BroadcastForm } from "./broadcast-form";
import { FriendsTable } from "./friends-table";

export const dynamic = "force-dynamic";

export default async function SteamBotAdminPage() {
  // The admin layout already gates /admin/*.
  const [health, friends, recipientCount] = await Promise.all([
    friendsBotHealth(),
    listBotFriends(),
    countBroadcastRecipients(),
  ]);

  const active = friends.filter((f) => f.friendStatus === "active").length;
  const linked = friends.filter((f) => f.linked).length;

  const status = health.ready
    ? { label: "Online", cls: "bg-emerald-500/15 text-emerald-500" }
    : health.ok
      ? { label: "Connecting…", cls: "bg-amber-500/15 text-amber-500" }
      : { label: "Offline", cls: "bg-red-500/15 text-red-500" };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Steam friends bot</h1>
          <p className="text-muted-foreground text-sm">
            {active} active {active === 1 ? "friend" : "friends"} · {linked} linked.
            Broadcast or DM individuals below.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${status.cls}`}
          title={
            health.ready
              ? "Worker connected to Steam"
              : health.ok
                ? "Worker reachable but not logged into Steam yet"
                : "Worker not reachable (is `pnpm steam-friends-bot` running?)"
          }
        >
          ● {status.label}
        </span>
      </div>

      <BroadcastForm recipientCount={recipientCount} />
      <FriendsTable friends={friends} />
    </div>
  );
}
