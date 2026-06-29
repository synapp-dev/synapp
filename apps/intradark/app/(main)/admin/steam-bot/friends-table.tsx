"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

import { sendDirectMessageAction } from "@/entities/notifications/actions";
import type { BotFriendRow } from "@/entities/notifications/lib/server/steam-dm";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function FriendsTable({ friends }: { friends: BotFriendRow[] }) {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) => f.name.toLowerCase().includes(q) || f.steamid64.includes(q),
    );
  }, [friends, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends ({friends.length})</CardTitle>
        <CardDescription>
          Everyone who has added the bot. Click “Message” to DM someone directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or Steam ID…"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
        />

        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {friends.length === 0 ? "No friends yet." : "No matches."}
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {filtered.map((f) => (
              <li key={f.steamid64} className="py-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.avatar ?? "/avatar-placeholder.png"}
                    alt=""
                    width={36}
                    height={36}
                    className="bg-muted size-9 shrink-0 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{f.name}</span>
                      {f.linked ? (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                          linked
                        </span>
                      ) : (
                        <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px]">
                          unlinked
                        </span>
                      )}
                      {f.friendStatus !== "active" && (
                        <span className="text-muted-foreground text-[10px]">
                          ({f.friendStatus})
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {f.steamid64} · added {timeAgo(f.addedAt)} · last DM{" "}
                      {timeAgo(f.lastDmAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={openId === f.steamid64 ? "secondary" : "outline"}
                    onClick={() =>
                      setOpenId((id) => (id === f.steamid64 ? null : f.steamid64))
                    }
                  >
                    Message
                  </Button>
                </div>
                {openId === f.steamid64 && (
                  <DirectComposer
                    steamid64={f.steamid64}
                    name={f.name}
                    onSent={() => setOpenId(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DirectComposer({
  steamid64,
  name,
  onSent,
}: {
  steamid64: string;
  name: string;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const res = await sendDirectMessageAction({ steamid64, body });
      if (res.ok) {
        toast.success(`Sent to ${name}`);
        setBody("");
        onSent();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 pl-12">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={900}
        rows={3}
        placeholder={`Message ${name}…`}
        className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
      />
      <div className="flex justify-end">
        <Button size="sm" disabled={pending || body.trim().length === 0} onClick={send}>
          {pending ? "Sending…" : "Send DM"}
        </Button>
      </div>
    </div>
  );
}
