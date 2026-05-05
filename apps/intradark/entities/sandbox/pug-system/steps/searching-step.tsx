"use client";

import { Button } from "@workspace/ui/components/button";

export function SearchingStep({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-4">
      <div className="flex items-center gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2.5 rounded-full bg-sky-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-sky-100">
            Searching for a match…
          </p>
          <p className="text-xs text-sky-200/70">
            Est. wait ~2:40 · Skill level 10 (mock)
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Cancel returns to the play hub step.
      </p>
    </div>
  );
}
