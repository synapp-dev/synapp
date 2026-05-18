import {
  SLIDE_EXIT_STAGGER_MS,
  SLIDE_STAGGER_BODY,
} from "@/entities/dashboard/components/superbot-suggestions-carousel-constants";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
  ).toUpperCase();
}

function ContextMetricCard({
  label,
  value,
  hint,
  labelTone,
}: {
  label: string;
  value: string;
  hint?: string;
  labelTone: "positive" | "negative" | "neutral";
}) {
  const tone =
    labelTone === "positive"
      ? "text-green-700 dark:text-green-400"
      : labelTone === "negative"
        ? "text-red-700 dark:text-red-400"
        : "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-background/90 px-3 py-2.5 shadow-sm dark:bg-background/60">
      <p className={cn("text-sm font-semibold leading-tight", tone)}>{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums leading-none",
          tone,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ContextWidgets({ suggestionId }: { suggestionId: string }) {
  switch (suggestionId) {
    case "menu":
      return (
        <div
          className="flex flex-col gap-2.5"
          aria-label="Menu performance context"
        >
          <div className="inline-flex w-fit items-center rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-bold tracking-wide text-muted-foreground">
            Q1
          </div>
          <ContextMetricCard
            label="Paninis"
            value="34.2%"
            hint="Gross margin · vs menu avg"
            labelTone="positive"
          />
          <ContextMetricCard
            label="Wraps"
            value="16.4%"
            hint="Gross margin · trailing paninis"
            labelTone="negative"
          />
        </div>
      );
    case "timesheets": {
      const outstandingPreview = [
        "Priya Sharma",
        "Marcus Chen",
        "Elena Ortiz",
      ] as const;
      const outstandingMore = 3;

      return (
        <div className="flex flex-col gap-2.5" aria-label="Timesheet context">
          <div className="inline-flex w-fit rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-semibold text-muted-foreground">
            This pay period
          </div>
          <div className="rounded-lg border border-border bg-background/90 px-3 py-2.5 shadow-sm dark:bg-background/60">
            <p className="text-xs font-medium text-muted-foreground">
              Outstanding submissions
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {outstandingPreview.map((name) => (
                <div
                  key={name}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-2 py-1.5"
                >
                  <Avatar
                    className="size-7 shrink-0 border border-border/60 bg-muted"
                    aria-hidden
                  >
                    <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                      {initialsFromDisplayName(name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="min-w-0 truncate text-xs font-medium text-foreground">
                    {name}
                  </p>
                </div>
              ))}
              <div className="flex min-h-[34px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-2 py-1.5">
                <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                  + {outstandingMore} more
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Close before Friday for payroll
            </p>
          </div>
        </div>
      );
    }
    case "roster":
      return (
        <div className="flex flex-col gap-2.5" aria-label="Roster context">
          <div className="inline-flex w-fit rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-semibold text-muted-foreground">
            Next week
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 shadow-sm">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
              Tue · lunch
            </p>
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
              Open cover
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 shadow-sm">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
              Wed · lunch
            </p>
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
              Open cover
            </p>
          </div>
        </div>
      );
    case "order-guide":
      return (
        <div className="flex flex-col gap-2.5" aria-label="Order guide context">
          <div className="inline-flex w-fit rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-semibold text-muted-foreground">
            Par drift
          </div>
          <ContextMetricCard
            label="Dairy"
            value="−8%"
            hint="vs target par · post long weekend"
            labelTone="negative"
          />
          <ContextMetricCard
            label="Produce"
            value="−12%"
            hint="vs target par · same window"
            labelTone="negative"
          />
        </div>
      );
    default:
      return null;
  }
}

export type SuperbotSuggestionsContextPanelProps = {
  suggestionId: string;
  reduceMotion: boolean;
  slideExiting: boolean;
  className?: string;
};

export function SuperbotSuggestionsContextPanel({
  suggestionId,
  reduceMotion,
  slideExiting,
  className,
}: SuperbotSuggestionsContextPanelProps) {
  return (
    <aside
      aria-label="Suggestion context"
      className={cn(
        "flex min-h-0 min-w-0 flex-[2] flex-col gap-3 overflow-y-auto  bg-transparent px-4 py-4 md:border-t-0 md:border-l md:px-5",
        className,
      )}
    >
      <div
        key={suggestionId}
        style={
          reduceMotion
            ? undefined
            : {
                animationDelay: `${SLIDE_STAGGER_BODY * SLIDE_EXIT_STAGGER_MS}ms`,
              }
        }
        className={cn(
          !reduceMotion &&
            !slideExiting &&
            "animate-slide-right-fade-in-slow",
          slideExiting &&
            !reduceMotion &&
            "animate-slide-right-fade-out-slow",
          slideExiting &&
            reduceMotion &&
            "opacity-0 transition-opacity duration-150",
        )}
      >
        <ContextWidgets suggestionId={suggestionId} />
      </div>
    </aside>
  );
}
