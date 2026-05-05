"use client";

import { FaceitPlayMock } from "@/components/organisms/faceit-play-mock";
import { Button } from "@workspace/ui/components/button";

export function PlayHubStep({ onSimulateQueue }: { onSimulateQueue: () => void }) {
  return (
    <div className="space-y-4">
      <FaceitPlayMock />
      <div className="flex flex-col items-center gap-2">
        <Button type="button" onClick={onSimulateQueue}>
          Simulate queue (sandbox)
        </Button>
        <p className="max-w-md text-center text-xs text-muted-foreground">
          Or use <strong>Next</strong> in the dock to advance without queueing.
        </p>
      </div>
    </div>
  );
}
