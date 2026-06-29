"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";

import { sendAdminBroadcastAction } from "@/entities/notifications/actions";

export function BroadcastForm({ recipientCount }: { recipientCount: number }) {
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(testOnly: boolean) {
    startTransition(async () => {
      const res = await sendAdminBroadcastAction({ body, link, testOnly });
      if (res.ok) {
        toast.success(res.message);
        if (!testOnly) {
          setConfirming(false);
          setBody("");
          setLink("");
        }
      } else {
        toast.error(res.error);
      }
    });
  }

  const disabled = pending || body.trim().length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcast</CardTitle>
        <CardDescription>
          DM all opted-in friends. Reaches <strong>{recipientCount}</strong>{" "}
          {recipientCount === 1 ? "person" : "people"} (announcements pref on).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="broadcast-body">Message</Label>
          <textarea
            id="broadcast-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={900}
            rows={4}
            placeholder="What do you want to tell everyone?"
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
          <p className="text-muted-foreground text-right text-xs">{body.length}/900</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="broadcast-link">Link (optional)</Label>
          <input
            id="broadcast-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://intradark.com/news/…"
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button variant="outline" disabled={disabled} onClick={() => run(true)}>
            Send test to me
          </Button>

          {!confirming ? (
            <Button disabled={disabled} onClick={() => setConfirming(true)}>
              Send to everyone…
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => run(false)}
              >
                {pending
                  ? "Sending…"
                  : `Confirm — DM ${recipientCount} ${recipientCount === 1 ? "person" : "people"}`}
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
