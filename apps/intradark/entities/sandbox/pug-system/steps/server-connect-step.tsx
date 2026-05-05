"use client";

import * as React from "react";

import { ServerPhasePanel } from "@/app/(main)/match/[id]/server/server-phase-panel";
import { usePugPlayout } from "../pug-playout-context";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function ServerConnectStep() {
  const { serverSimulateStall } = usePugPlayout();
  const [recovered, setRecovered] = React.useState(false);

  React.useEffect(() => {
    if (!serverSimulateStall) {
      setRecovered(false);
    }
  }, [serverSimulateStall]);

  if (serverSimulateStall && !recovered) {
    return (
      <Card className="mx-auto max-w-lg border-destructive/40">
        <CardHeader>
          <CardTitle className="text-lg">Server start stalled</CardTitle>
          <CardDescription>
            Not all expected players reported on the game server (mock).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-mono text-xs text-muted-foreground">
            Error code: <span className="text-foreground">SRV-503</span>
          </p>
          <p className="text-muted-foreground">
            Connected <span className="font-medium text-foreground">7</span> /{" "}
            <span className="font-medium text-foreground">10</span> (sandbox
            preset).
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setRecovered(true)}>
            Retry connection
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRecovered(true)}
          >
            Simulate all connected
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return <ServerPhasePanel />;
}
