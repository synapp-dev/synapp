"use client";

import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  type LucideIcon,
  Sparkles,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import * as React from "react";

import { useScopedNavigation } from "@/entities/access/scoped-navigation-context";
import {
  dummySuperbotSuggestions,
  type SuperbotSuggestion,
  type SuperbotSuggestionIconId,
} from "@/entities/dashboard/model/dummy-superbot-suggestions";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

const AUTO_ADVANCE_MS = 10_000;
const TICK_MS = 100;
const PROGRESS_STEP = TICK_MS / AUTO_ADVANCE_MS;

const ICONS: Record<SuperbotSuggestionIconId, LucideIcon> = {
  users: Users,
  calendar: Calendar,
  "clipboard-list": ClipboardList,
  utensils: UtensilsCrossed,
};

function suggestionHref(
  suggestion: SuperbotSuggestion,
  scope: { organisationSlug: string; venueSlug: string } | null,
): string | null {
  if (!scope) {
    return null;
  }
  const suffix = suggestion.pathSuffix.replace(/^\/+/, "");
  return `/${scope.organisationSlug}/${scope.venueSlug}/${suffix}`;
}

export type SuperbotSuggestionsCardProps = {
  suggestions?: readonly SuperbotSuggestion[];
};

export function SuperbotSuggestionsCard({
  suggestions = dummySuperbotSuggestions,
}: SuperbotSuggestionsCardProps) {
  const { resolvedScope } = useScopedNavigation();
  const reduceMotion = usePrefersReducedMotion();
  const list = React.useMemo(() => [...suggestions], [suggestions]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [hoverPaused, setHoverPaused] = React.useState(false);
  const [progress01, setProgress01] = React.useState(0);
  const progressRef = React.useRef(0);
  const hoverPausedRef = React.useRef(false);

  React.useEffect(() => {
    hoverPausedRef.current = hoverPaused;
  }, [hoverPaused]);

  const n = list.length;
  const active = n > 0 ? list[activeIndex % n]! : null;

  const goTo = React.useCallback(
    (index: number) => {
      if (n === 0) {
        return;
      }
      setActiveIndex(((index % n) + n) % n);
    },
    [n],
  );

  React.useEffect(() => {
    progressRef.current = 0;
    setProgress01(0);
  }, [activeIndex]);

  React.useEffect(() => {
    if (reduceMotion || n === 0) {
      return;
    }

    const id = window.setInterval(() => {
      if (hoverPausedRef.current) {
        return;
      }
      progressRef.current += PROGRESS_STEP;
      if (progressRef.current >= 1) {
        progressRef.current = 0;
        setActiveIndex((i) => (i + 1) % n);
        setProgress01(0);
        return;
      }
      setProgress01(progressRef.current);
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [n, reduceMotion]);

  if (n === 0 || !active) {
    return null;
  }

  const href = suggestionHref(active, resolvedScope);
  const motionProgressPercent = progress01 * 100;
  const ActiveIcon = ICONS[active.iconId];

  return (
    <section
      role="region"
      aria-labelledby="superbot-suggestions-heading"
      className="flex flex-col gap-4 py-6"
    >
      <Separator />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <h2
            id="superbot-suggestions-heading"
            className="text-sm font-semibold leading-snug tracking-tight"
          >
            Superbot suggestions{" "}
            <span className="font-medium text-muted-foreground">(demo)</span>
          </h2>
        </div>
      </div>

      <div
        data-testid="superbot-suggestions-hover-surface"
        className="overflow-hidden"
        onMouseEnter={() => {
          setHoverPaused(true);
        }}
        onMouseLeave={() => {
          setHoverPaused(false);
        }}
      >
        <div className="py-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-stretch md:gap-4">
            <div className="min-w-0 w-full md:col-span-1">
              <div
                className="grid h-full min-h-0 w-full grid-cols-1 grid-rows-6 gap-1.5"
                role="group"
                aria-label="Jump to a suggestion"
              >
                {Array.from({ length: 6 }, (_, cellIndex) => {
                  const s = list[cellIndex];
                  if (!s) {
                    return (
                      <div
                        key={`superbot-suggestion-slot-${cellIndex}`}
                        className="min-h-11 rounded-md border border-dotted border-muted-foreground/40 bg-transparent"
                        aria-hidden
                      />
                    );
                  }
                  const i = cellIndex;
                  const Icon = ICONS[s.iconId];
                  const selected = i === activeIndex;
                  return (
                    <Button
                      key={s.id}
                      type="button"
                      variant={selected ? "secondary" : "outline"}
                      className="h-auto min-h-11 w-full min-w-0 flex-row items-center justify-start gap-2 rounded-md px-2 py-2 text-left font-normal"
                      aria-label={`Show suggestion: ${s.title}`}
                      aria-pressed={selected}
                      onClick={() => {
                        goTo(i);
                      }}
                    >
                      <Icon
                        className="h-5 w-5 shrink-0 text-foreground"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 text-left text-xs font-medium leading-snug tracking-tight text-foreground line-clamp-2">
                        {s.gridLabel}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 md:col-span-3">
              <Card className="min-h-0 w-full min-w-0 overflow-hidden">
                <CardHeader className="border-b pb-4">
                  <div className="flex items-start gap-3">
                    <ActiveIcon
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <h3 className="text-lg font-semibold leading-snug tracking-tight">
                      {active.title}
                    </h3>
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  <p
                    aria-live="polite"
                    className="line-clamp-3 text-sm leading-snug text-muted-foreground"
                  >
                    {active.description}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-3 border-t bg-muted/20 pt-6">
                  <div>
                    {href ? (
                      <Button asChild size="sm">
                        <Link href={href}>{active.ctaLabel}</Link>
                      </Button>
                    ) : (
                      <Button type="button" size="sm" disabled>
                        {active.ctaLabel}
                      </Button>
                    )}
                    {!href ? (
                      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                        Select an organisation and venue from the sidebar to
                        open this task.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    {reduceMotion ? (
                      <div
                        className="flex gap-1"
                        role="img"
                        aria-label={`Suggestion ${activeIndex + 1} of ${n}`}
                      >
                        {list.map((s, i) => (
                          <div
                            key={s.id}
                            className={cn(
                              "h-1.5 flex-1 rounded-full",
                              i === activeIndex ? "bg-primary" : "bg-muted",
                            )}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80"
                        aria-hidden
                      >
                        <div
                          className={cn(
                            "h-full rounded-full bg-primary transition-none",
                            hoverPaused && "opacity-90",
                          )}
                          style={{ width: `${motionProgressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
