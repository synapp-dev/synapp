"use client";

import { useRef, useState } from "react";
import { HeartPulse } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { useImportHealth } from "@/hooks/health/use-health";

/** Drop zone for an iOS "Health Auto Export" JSON file. Parses the file in the
 *  browser and posts the object to the import route (re-importing is safe). */
export function HealthImportCard() {
  const importHealth = useImportHealth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setResult(null);
    setParseError(null);

    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      setParseError("That file isn't valid JSON — export again from Health Auto Export.");
      return;
    }

    importHealth.mutate(payload, {
      onSuccess: (summary) => {
        setResult(
          `Imported ${summary.metrics.toLocaleString()} metric samples, ${summary.sleepNights} sleep night${summary.sleepNights === 1 ? "" : "s"}, and ${summary.workouts} workout${summary.workouts === 1 ? "" : "s"}.`
        );
      },
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void handleFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border/60 hover:border-border"
          )}
        >
          <HeartPulse className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop a Health Auto Export <code>.json</code> here
          </p>
          <p className="text-xs text-muted-foreground">
            or click to choose a file — re-importing is safe (existing days are
            updated, not duplicated)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </div>

        {importHealth.isPending ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner className="h-3 w-3" />
            Importing… large exports can take a moment.
          </p>
        ) : null}
        {parseError ? (
          <p className="mt-3 text-sm text-destructive">{parseError}</p>
        ) : null}
        {importHealth.error ? (
          <p className="mt-3 text-sm text-destructive">
            {importHealth.error.message}
          </p>
        ) : null}
        {result && !importHealth.isPending ? (
          <p className="mt-3 text-sm text-muted-foreground">{result}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
