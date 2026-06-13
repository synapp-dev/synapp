"use client";

import { AlertCircle, Bot } from "lucide-react";

import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { cn } from "@workspace/ui/lib/utils";

export type AuthAlertState = {
  title: string;
  description: string;
  tone: "info" | "error";
};

export type AuthStreamingAlertProps = {
  alert: AuthAlertState;
  reduceMotion: boolean;
  className?: string;
};

export function AuthStreamingAlert({
  alert,
  reduceMotion,
  className,
}: AuthStreamingAlertProps) {
  const streamKey = `${alert.tone}:${alert.title}:${alert.description}`;
  const streamLen = useStreamingText(
    alert.description,
    streamKey,
    reduceMotion,
    true,
  );
  const streamComplete = reduceMotion || streamLen >= alert.description.length;

  return (
    <div
      className={cn(
        "rounded-md border p-3",
        alert.tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-primary/30 bg-primary/5 text-foreground",
        className,
      )}
      role={alert.tone === "error" ? "alert" : "status"}
    >
      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
        {alert.tone === "error" ? (
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Bot className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        )}
        {alert.title}
      </div>
      <p
        aria-live={streamComplete ? "polite" : "off"}
        className={cn(
          "text-sm leading-snug",
          alert.tone === "error"
            ? "text-destructive/90"
            : "text-muted-foreground",
        )}
      >
        {alert.description.slice(0, streamLen)}
        {!reduceMotion && !streamComplete ? (
          <span
            className="ml-px inline-block h-[1.05em] w-px animate-pulse bg-current/60 align-middle"
            aria-hidden
          />
        ) : null}
      </p>
    </div>
  );
}
