"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";

import { createBrowserClient } from "@/utils/supabase/client";

type PrefKey =
  | "notify_match"
  | "notify_news"
  | "notify_scrim"
  | "notify_broadcast";

const CATEGORIES: { key: PrefKey; label: string; desc: string }[] = [
  {
    key: "notify_match",
    label: "Match pops",
    desc: "When a match is found — reply “accept” right in Steam chat.",
  },
  {
    key: "notify_news",
    label: "News articles",
    desc: "When a new Intradark article is published.",
  },
  {
    key: "notify_scrim",
    label: "Scrim activity",
    desc: "New listings in your region, challenges, and accepted scrims.",
  },
  {
    key: "notify_broadcast",
    label: "Announcements",
    desc: "Occasional important updates from the Intradark team.",
  },
];

export function NotificationSettings({
  userId,
  steamLinked,
  connected,
  initialPrefs,
  botProfileUrl,
}: {
  userId: string;
  steamLinked: boolean;
  connected: boolean;
  initialPrefs: Record<string, boolean> | null;
  botProfileUrl: string | null;
}) {
  const supabase = createBrowserClient();
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    notify_match: initialPrefs?.notify_match ?? true,
    notify_news: initialPrefs?.notify_news ?? true,
    notify_scrim: initialPrefs?.notify_scrim ?? true,
    notify_broadcast: initialPrefs?.notify_broadcast ?? true,
  });
  const [saving, setSaving] = useState<PrefKey | null>(null);

  async function toggle(key: PrefKey, value: boolean) {
    const prev = prefs[key];
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaving(key);
    const { error } = await supabase.from("steam_notification_prefs").upsert(
      { user_id: userId, [key]: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    setSaving(null);
    if (error) {
      setPrefs((p) => ({ ...p, [key]: prev }));
      toast.error("Couldn't save that — try again.");
    } else {
      toast.success("Saved");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Steam notification bot</CardTitle>
          <CardDescription>
            {!steamLinked
              ? "Link your Steam account to your profile first to receive notifications."
              : connected
                ? "✅ Connected — you're friends with the bot and will receive the categories enabled below."
                : "Add the bot on Steam to start receiving notifications. It auto-accepts your request."}
          </CardDescription>
        </CardHeader>
        {steamLinked && !connected && (
          <CardContent>
            {botProfileUrl ? (
              <Button asChild>
                <a href={botProfileUrl} target="_blank" rel="noreferrer">
                  Add the Intradark bot on Steam
                </a>
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">
                Bot profile link not configured yet. Set
                {" "}
                <code>NEXT_PUBLIC_STEAM_FRIENDS_BOT_PROFILE_URL</code>.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What the bot sends you</CardTitle>
          <CardDescription>
            Turn individual categories on or off. Removing the bot on Steam stops
            everything.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor={c.key} className="text-sm font-medium">
                  {c.label}
                </Label>
                <p className="text-muted-foreground text-xs">{c.desc}</p>
              </div>
              <Switch
                id={c.key}
                checked={prefs[c.key]}
                disabled={!steamLinked || saving === c.key}
                onCheckedChange={(v) => toggle(c.key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
