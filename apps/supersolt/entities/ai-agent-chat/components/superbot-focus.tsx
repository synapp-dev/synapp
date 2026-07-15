"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sparkles, X } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  getSuperbotFocusIntent,
  SUPERBOT_FOCUS_QUERY_PARAM,
  type SuperbotFocusIntent,
} from "@/entities/ai-agent-chat/lib/superbot-focus";
import type { AppNavigationDestinationKey } from "@/entities/ai-agent-chat/lib/app-navigation-catalog";

/** The Superbot focus intent the current URL is priming, if any. */
export function useSuperbotFocusIntent(): SuperbotFocusIntent | null {
  const searchParams = useSearchParams();
  const raw = searchParams.get(SUPERBOT_FOCUS_QUERY_PARAM);
  return React.useMemo(() => getSuperbotFocusIntent(raw), [raw]);
}

/** Removes the `?superbot=` flag from the URL without a navigation. */
export function useDismissSuperbotFocus(): () => void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return React.useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(SUPERBOT_FOCUS_QUERY_PARAM);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);
}

/**
 * Marks a control as the target of a Superbot action. When the URL primes this
 * `targetId`, the returned `ref` is scrolled into view and `active` is true so
 * the caller can apply the `animate-superbot-focus-pulse` glow.
 *
 *   const { active, ref } = useSuperbotFocusTarget<HTMLButtonElement>("superbot-start-count");
 *   <Button ref={ref} className={cn(active && SUPERBOT_FOCUS_PULSE)}>New count</Button>
 */
export function useSuperbotFocusTarget<T extends HTMLElement = HTMLElement>(
  targetId: string,
): { active: boolean; ref: React.RefObject<T | null> } {
  const intent = useSuperbotFocusIntent();
  const active = intent?.targetId === targetId;
  const ref = React.useRef<T | null>(null);

  React.useEffect(() => {
    if (!active) return;
    // Let the page settle (data may still be streaming in) before scrolling.
    const id = window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => window.clearTimeout(id);
  }, [active]);

  return { active, ref };
}

/** Tailwind class applying the breathing focus-glow (defined in ui globals). */
export const SUPERBOT_FOCUS_PULSE = "animate-superbot-focus-pulse rounded-[inherit]";

/**
 * Wraps a control so it glows when a Superbot action targets `targetId`, and
 * scrolls it into view on arrival. Use when a control is nested or you'd rather
 * not thread the target hook through the host component's own hooks.
 *
 *   <SuperbotFocusRing targetId="superbot-log-waste">
 *     <Button>Log waste</Button>
 *   </SuperbotFocusRing>
 */
export function SuperbotFocusRing({
  targetId,
  className,
  children,
}: {
  targetId: string;
  /** Radius/utility overrides so the glow hugs the wrapped control's shape. */
  className?: string;
  children: React.ReactNode;
}) {
  const intent = useSuperbotFocusIntent();
  const active = intent?.targetId === targetId;
  const ref = React.useRef<HTMLSpanElement | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => window.clearTimeout(id);
  }, [active]);

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex rounded-md",
        active && "animate-superbot-focus-pulse",
        className,
      )}
    >
      {children}
    </span>
  );
}

export type SuperbotFocusBannerProps = {
  /**
   * The page this banner sits on. It only renders when an active intent targets
   * this destination, so it stays inert on normal visits.
   */
  destination: AppNavigationDestinationKey;
  className?: string;
};

/**
 * "Superbot sent you here" banner for a destination page. Renders only when the
 * URL primes an intent for `destination`; dismissing it clears the flag (and
 * the paired control glow).
 */
export function SuperbotFocusBanner({
  destination,
  className,
}: SuperbotFocusBannerProps) {
  const intent = useSuperbotFocusIntent();
  const dismiss = useDismissSuperbotFocus();

  if (!intent || intent.destination !== destination) {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        "animate-slide-down-fade-in flex items-start gap-3 rounded-xl border px-4 py-3",
        "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background",
        "dark:border-emerald-400/25 dark:from-emerald-400/10 dark:via-emerald-400/5",
        className,
      )}
    >
      <span
        aria-hidden
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      >
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/90 dark:text-emerald-300/90">
          {intent.bannerTitle}
        </p>
        <p className="mt-0.5 text-sm leading-snug text-foreground">
          {intent.guidance}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="-mr-1 -mt-1 size-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
        aria-label="Dismiss Superbot suggestion"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
