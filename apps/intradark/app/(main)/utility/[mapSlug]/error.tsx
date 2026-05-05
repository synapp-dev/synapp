"use client";

import { useEffect } from "react";

import { Button } from "@workspace/ui/components/button";

export default function UtilityMapError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="border-border bg-card text-card-foreground mx-auto max-w-lg space-y-4 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">Could not load this map</h2>
      <p className="text-muted-foreground text-sm">
        Something went wrong while loading utility data. You can try again in a
        moment.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground font-mono text-xs">
          Reference: {error.digest}
        </p>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Retry
      </Button>
    </div>
  );
}
