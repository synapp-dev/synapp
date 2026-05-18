"use client";

import { ChevronsRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import {
  appNavPathsMatch,
  clearAgentNavAutoRedirectMarker,
  markAgentNavAutoRedirect,
  readRecentAgentNavAutoRedirect,
} from "@/entities/ai-agent-chat/lib/agent-nav-auto-redirect-guard";
import type { AppNavigationCard } from "@/entities/ai-agent-chat/lib/app-navigation-tool-schema";
import { getAppNavigationDestinationIcon } from "@/entities/ai-agent-chat/lib/app-navigation-destination-icons";

/**
 * If a venue name starts with the organisation name (e.g. "Piccolo Panini Bar
 * Hawthorn" for org "Piccolo Panini Bar"), strip the org prefix so the
 * subtitle reads `Org · Hawthorn` instead of `Org · Piccolo Panini Bar Hawthorn`.
 * Falls back to the original venue name when no clean trim is possible.
 */
function cleanVenueName(venueName: string, orgName: string): string {
  const v = venueName.trim();
  const o = orgName.trim();
  if (!o) return v;
  if (v.toLowerCase() === o.toLowerCase()) return v;
  if (v.toLowerCase().startsWith(o.toLowerCase())) {
    const rest = v.slice(o.length).replace(/^[\s\-·,:|]+/, "").trim();
    if (rest.length > 0) return rest;
  }
  return v;
}

const AUTO_REDIRECT_MS = 5000;

type AgentNavDestinationCardsProps = {
  cards: AppNavigationCard[];
  /**
   * When false, suppresses the auto-redirect countdown regardless of card count.
   * Used by the chat panel to disable auto-redirect on cards that are no longer
   * the latest agent activity (e.g. the user has navigated since). Defaults to
   * true for backwards compatibility.
   */
  autoRedirectAllowed?: boolean;
};

function AgentNavDestinationCardItem({
  card,
  isMostRecent,
  enableAutoRedirect,
}: {
  card: AppNavigationCard;
  /** Cards that aren't the latest agent activity hide the Go CTA and make the
   * entire card a click target instead. */
  isMostRecent: boolean;
  /** Independent of `isMostRecent`: only true when there's exactly one card on
   * the latest agent message, so the countdown is unambiguous. */
  enableAutoRedirect: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const routerRef = useRef(router);
  routerRef.current = router;

  const [cancelled, setCancelled] = useState(false);
  const [remainingMs, setRemainingMs] = useState(AUTO_REDIRECT_MS);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const navigatedRef = useRef(false);

  const skipAutoRedirect =
    appNavPathsMatch(pathname, card.href) || readRecentAgentNavAutoRedirect(card.href);
  const showCountdown = enableAutoRedirect && !cancelled && !skipAutoRedirect;

  const Icon = getAppNavigationDestinationIcon(card.destinationKey);

  const stopRedirect = useCallback(() => {
    setCancelled(true);
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    startRef.current = null;
  }, []);

  useEffect(() => {
    if (!enableAutoRedirect || cancelled) return;

    if (appNavPathsMatch(pathname, card.href)) {
      clearAgentNavAutoRedirectMarker();
      return;
    }

    if (readRecentAgentNavAutoRedirect(card.href)) {
      return;
    }

    startRef.current = null;
    navigatedRef.current = false;
    setRemainingMs(AUTO_REDIRECT_MS);

    void routerRef.current.prefetch(card.href);

    const tick = (now: number) => {
      if (startRef.current === null) {
        startRef.current = now;
      }
      const elapsed = now - startRef.current;
      const left = Math.max(0, AUTO_REDIRECT_MS - elapsed);
      setRemainingMs(left);

      if (left <= 0) {
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          markAgentNavAutoRedirect(card.href);
          routerRef.current.push(card.href);
        }
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enableAutoRedirect, cancelled, card.href, pathname]);

  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const progress = remainingMs / AUTO_REDIRECT_MS;
  /** Elapsed fraction (0 → 1): bar grows toward redirect instead of draining. */
  const fillProgress = 1 - progress;
  const cleanedVenue = cleanVenueName(card.venueName, card.organisationName);

  const cardInner = (
    <Card
      className={cn(
        "border-primary/25 bg-muted/20 w-full animate-slide-down-fade-in gap-3 border py-4 transition-colors",
        isMostRecent && "group/nav-card",
        "hover:bg-[color-mix(in_oklab,var(--brand-supersolt-primary)_10%,transparent)]",
      )}
    >
      <CardHeader className="gap-0 px-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md border border-border/60 transition-colors",
              "group-hover/nav-card:bg-[color-mix(in_oklab,var(--brand-supersolt-primary)_25%,transparent)]",
            )}
            aria-hidden
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-tight">
              {card.title}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
              {card.organisationName}
              <span className="text-muted-foreground/80 px-1" aria-hidden>
                ·
              </span>
              {cleanedVenue}
            </p>
          </div>
        </div>
      </CardHeader>

      {card.description ? (
        <CardContent className="text-muted-foreground px-4 text-sm leading-relaxed">
          {card.description}
        </CardContent>
      ) : null}

      {isMostRecent ? (
        <CardFooter className="justify-end gap-1 px-4 pt-0">
          {showCountdown ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={stopRedirect}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            asChild
            size="sm"
            className="relative overflow-hidden bg-[var(--brand-supersolt-primary)] text-[var(--brand-supersolt-primary-foreground)] hover:bg-[var(--brand-supersolt-primary)] hover:brightness-95 focus-visible:ring-[color-mix(in_oklab,var(--brand-supersolt-primary)_60%,transparent)]"
          >
            <Link href={card.href} aria-label={`Open ${card.title}`}>
              {showCountdown ? (
                <span
                  className="text-[var(--brand-supersolt-primary-foreground)]/75 tabular-nums"
                  aria-live="polite"
                >
                  {secondsLeft}s
                </span>
              ) : null}
              <span>Go</span>
              <ChevronsRight className="size-4" aria-hidden />
              {showCountdown ? (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-black/15"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(fillProgress * 100)}
                  aria-label="Redirect countdown"
                >
                  <span
                    className="block h-full bg-black/60"
                    style={{ width: `${fillProgress * 100}%` }}
                  />
                </span>
              ) : null}
            </Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );

  if (!isMostRecent) {
    return (
      <Link
        href={card.href}
        aria-label={`Open ${card.title}`}
        className="group/nav-card focus-visible:outline-ring block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {cardInner}
      </Link>
    );
  }
  return cardInner;
}

export function AgentNavDestinationCards({
  cards,
  autoRedirectAllowed = true,
}: AgentNavDestinationCardsProps) {
  if (cards.length === 0) {
    return null;
  }

  const isMostRecent = autoRedirectAllowed;
  const enableAutoRedirect = isMostRecent && cards.length === 1;

  return (
    <div className="flex w-full flex-col gap-2">
      {cards.map((card) => (
        <AgentNavDestinationCardItem
          key={card.href}
          card={card}
          isMostRecent={isMostRecent}
          enableAutoRedirect={enableAutoRedirect}
        />
      ))}
    </div>
  );
}
