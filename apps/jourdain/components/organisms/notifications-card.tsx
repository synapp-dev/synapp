"use client";

import { useState } from "react";
import { Bell, BellRing, Check, Send, Share, Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  useNotificationSettings,
  usePushSubscription,
  useUpdateNotificationSettings,
} from "@/hooks/notifications/use-notifications";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const period = hour < 12 ? "am" : "pm";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return { value: hour, label: `${display}:00 ${period}` };
});

const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export function NotificationsCard() {
  const { capability, busy, error, subscribe, unsubscribe, sendTest } =
    usePushSubscription();
  const { data: settings } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const [testNote, setTestNote] = useState<string | null>(null);

  const subscribed = capability === "subscribed";

  async function handleTest() {
    setTestNote(null);
    const result = await sendTest();
    if (result && result.sent > 0) {
      setTestNote(`Sent to ${result.sent} device${result.sent > 1 ? "s" : ""}.`);
    }
  }

  function saveDigest(patch: { dailyDigestEnabled?: boolean; digestHour?: number }) {
    // Keep the timezone pinned to whatever device the user configures from.
    updateSettings.mutate({ ...patch, timezone: browserTimezone() });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push notifications
        </CardTitle>
        <CardDescription>
          Get reminders on this device, even when Jourdain isn&apos;t open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Device subscription state */}
        <div className="space-y-3">
          {capability === null ? (
            <p className="text-sm text-muted-foreground">Checking this device…</p>
          ) : capability === "unsupported" ? (
            <p className="text-sm text-muted-foreground">
              This browser doesn&apos;t support push notifications.
            </p>
          ) : capability === "needs-install" ? (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Smartphone className="h-4 w-4" />
                Install Jourdain first
              </p>
              <p className="text-muted-foreground">
                On iPhone, push only works from the installed app. Tap{" "}
                <Share className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
                <span className="font-medium text-foreground">Share</span> →{" "}
                <span className="font-medium text-foreground">
                  Add to Home Screen
                </span>
                , open Jourdain from the new icon, then come back here to enable
                notifications.
              </p>
            </div>
          ) : capability === "denied" ? (
            <p className="text-sm text-destructive">
              Notifications are blocked for Jourdain. Enable them in your device
              settings, then reload this page.
            </p>
          ) : subscribed ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Enabled on this device
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleTest}
              >
                <Send className="h-3.5 w-3.5" />
                Send test
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => unsubscribe()}
                disabled={busy}
              >
                disable
              </button>
            </div>
          ) : (
            <Button onClick={() => subscribe()} disabled={busy} className="gap-2">
              <BellRing className="h-4 w-4" />
              {busy ? "Enabling…" : "Enable notifications on this device"}
            </Button>
          )}

          {testNote ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {testNote}
            </p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        {/* Daily digest */}
        <div className="space-y-4 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Daily digest</Label>
              <p className="text-sm text-muted-foreground">
                A morning summary of tasks due and overdue.
              </p>
            </div>
            <Switch
              checked={settings?.dailyDigestEnabled ?? true}
              onCheckedChange={(checked) =>
                saveDigest({ dailyDigestEnabled: checked })
              }
            />
          </div>

          {(settings?.dailyDigestEnabled ?? true) ? (
            <div className="flex items-center gap-3">
              <Label htmlFor="digest-hour" className="text-sm text-muted-foreground">
                Send at
              </Label>
              <Select
                value={String(settings?.digestHour ?? 8)}
                onValueChange={(value) =>
                  saveDigest({ digestHour: Number(value) })
                }
              >
                <SelectTrigger id="digest-hour" className="h-8 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {settings?.timezone ?? browserTimezone()}
              </span>
            </div>
          ) : null}
        </div>

        <p className="border-t border-border/60 pt-5 text-xs text-muted-foreground">
          Want a nudge for a specific task? Open any task and set a{" "}
          <span className="font-medium text-foreground">Remind me</span> time.
        </p>
      </CardContent>
    </Card>
  );
}
