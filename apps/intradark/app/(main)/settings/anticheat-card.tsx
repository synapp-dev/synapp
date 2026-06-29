"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { createAcPairingLink, type AcStatus } from "@/entities/anticheat/actions";

/**
 * Anticheat pairing card. The pairing deep link is minted up-front (on mount + a
 * periodic refresh) and rendered as a real anchor, so the click is a genuine user
 * gesture — Chrome only launches a custom-protocol (`intradark-ac://`) handler from
 * a gesture, NOT from a navigation that happens after an `await`.
 */
export function AnticheatCard({
  steamLinked,
  status,
  downloadUrl,
}: {
  steamLinked: boolean;
  status: AcStatus;
  downloadUrl: string | null;
}) {
  const [pairUrl, setPairUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mint = useCallback(async () => {
    if (!steamLinked) return;
    const res = await createAcPairingLink();
    if (res.ok) {
      setPairUrl(res.url);
      setError(null);
    } else {
      setError(res.error);
    }
  }, [steamLinked]);

  // Mint on mount and refresh every 4 min (token TTL is 5 min) so the link is fresh.
  useEffect(() => {
    void mint();
    const t = setInterval(() => void mint(), 4 * 60_000);
    return () => clearInterval(t);
  }, [mint]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {status.live ? (
              <ShieldCheck className="size-5 text-emerald-500" />
            ) : (
              <ShieldAlert className="text-muted-foreground size-5" />
            )}
            <CardTitle>Anticheat</CardTitle>
          </div>
          <StatusBadge status={status} />
        </div>
        <CardDescription>
          The Veritas anticheat client must be running to play ranked matches. It
          checks your system integrity and runs a lightweight background scan — it
          never reads or touches the game itself.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {!steamLinked ? (
          <p className="text-muted-foreground text-sm">
            Link your Steam account first.
          </p>
        ) : pairUrl ? (
          <Button asChild>
            <a
              href={pairUrl}
              onClick={() =>
                toast.success("Opening Veritas AC…", {
                  description:
                    "Approve the “Open” prompt in your browser. If nothing opens, install the client first.",
                })
              }
            >
              <ShieldCheck className="size-4" />
              {status.paired ? "Re-pair this device" : "Pair this device"}
            </a>
          </Button>
        ) : (
          <Button disabled>
            <Loader2 className="size-4 animate-spin" />
            Preparing…
          </Button>
        )}

        {downloadUrl ? (
          <Button variant="outline" asChild>
            <a href={downloadUrl}>
              <Download className="size-4" />
              Download client
            </a>
          </Button>
        ) : null}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: AcStatus }) {
  if (status.live) {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Connected</Badge>;
  }
  if (status.paired) {
    return <Badge variant="secondary">Paired · offline</Badge>;
  }
  return <Badge variant="outline">Not paired</Badge>;
}
