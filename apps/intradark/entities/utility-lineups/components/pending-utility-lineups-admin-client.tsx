"use client";

import * as React from "react";
import Link from "next/link";

import { publishPendingUtilityLineupAction } from "@/entities/utility-lineups/actions/admin-utility-lineups-moderation-actions";
import { Button } from "@workspace/ui/components/button";

type Row = {
  lineup: {
    id: string;
    description: string;
    grenadeType: string;
    side: string;
    createdAt: string;
  };
  mapSlug: string;
  mapDisplayName: string;
};

export function PendingUtilityLineupsAdminClient({ rows }: { rows: Row[] }) {
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function publish(lineupId: string, mapSlug: string) {
    setMessage(null);
    setBusyId(lineupId);
    const res = await publishPendingUtilityLineupAction({ lineupId, mapSlug });
    setBusyId(null);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    window.location.reload();
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No pending lineup submissions.</p>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="text-destructive text-sm" role="alert">
          {message}
        </p>
      ) : null}
      <ul className="divide-border divide-y rounded-md border border-border">
        {rows.map(({ lineup, mapSlug, mapDisplayName }) => (
          <li
            key={lineup.id}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">
                {mapDisplayName}{" "}
                <span className="text-muted-foreground font-normal">({mapSlug})</span>
              </p>
              <p className="text-muted-foreground text-xs">
                {lineup.grenadeType} · {lineup.side} ·{" "}
                {new Date(lineup.createdAt).toLocaleString()}
              </p>
              <p className="line-clamp-2 text-sm">{lineup.description}</p>
              <Link
                href={`/utility/${mapSlug}`}
                className="text-primary text-xs font-medium hover:underline"
              >
                Open map →
              </Link>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={busyId === lineup.id}
              onClick={() => void publish(lineup.id, mapSlug)}
            >
              {busyId === lineup.id ? "Publishing…" : "Publish"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
