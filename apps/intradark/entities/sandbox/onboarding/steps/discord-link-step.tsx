"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function DiscordLinkStep({
  scenarioId,
  discordAttempt,
  onSuccess,
  onDecline,
}: {
  scenarioId: string;
  discordAttempt: number;
  onSuccess: () => void;
  onDecline: () => void;
}) {
  const declineFlow = scenarioId === "discord-declines-then-relinks";
  const showDeclined = declineFlow && discordAttempt === 1;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Discord OAuth (simulated)</CardTitle>
          <CardDescription>
            In production this uses{" "}
            <code className="rounded bg-muted px-1 text-xs">
              /api/auth/discord
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {showDeclined ? (
            <div className="rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              <p className="font-medium">Discord authorization declined</p>
              <p className="mt-1 text-xs text-red-100/80">
                Retry the simulated OAuth flow below.
              </p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={onSuccess}>
              {showDeclined ? "Retry · simulate success" : "Simulate success"}
            </Button>
            {declineFlow && discordAttempt === 0 ? (
              <Button type="button" variant="outline" onClick={onDecline}>
                Simulate decline
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
