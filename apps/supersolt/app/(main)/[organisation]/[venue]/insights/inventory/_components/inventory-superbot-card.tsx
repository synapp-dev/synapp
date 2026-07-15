"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import {
  APP_NAVIGATION_CATALOG,
  isAppNavigationDestinationKey,
  type AppNavigationDestinationKey,
} from "@/entities/ai-agent-chat/lib/app-navigation-catalog";
import { getAppNavigationDestinationIcon } from "@/entities/ai-agent-chat/lib/app-navigation-destination-icons";
import { DigestHighlightedLine } from "@/entities/dashboard/components/digest-rich-text";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { InventoryDigestStatus } from "./use-inventory-digest";
import { useSmoothReveal } from "./use-smooth-reveal";

export type InventorySuperbotCardProps = {
  organisation: string;
  venue: string;
  text: string;
  status: InventoryDigestStatus;
  onRegenerate: () => void;
  className?: string;
};

type BriefingLine =
  | { kind: "para"; text: string }
  | {
      kind: "action";
      text: string;
      /** null = marker missing/unknown, or still streaming in — render unlinked. */
      destination: AppNavigationDestinationKey | null;
      /** True while the "@key" marker itself may still be incomplete. */
      markerPending: boolean;
    };

const MAX_ACTION_ROWS = 2;

/**
 * Splits the briefing into paragraphs and "- @key text" action lines. The
 * marker is only trusted once a space follows the key (it may be mid-stream).
 */
function splitBriefing(text: string): BriefingLine[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line): BriefingLine => {
      if (!line.startsWith("- ")) {
        return { kind: "para", text: line };
      }
      const body = line.slice(2);
      if (!body.startsWith("@")) {
        return { kind: "action", text: body, destination: null, markerPending: false };
      }
      const spaceIndex = body.indexOf(" ");
      if (spaceIndex === -1) {
        // "@inventory_st…" still streaming in — hold the row until it completes.
        return { kind: "action", text: "", destination: null, markerPending: true };
      }
      const key = body.slice(1, spaceIndex);
      return {
        kind: "action",
        text: body.slice(spaceIndex + 1),
        destination: isAppNavigationDestinationKey(key) ? key : null,
        markerPending: false,
      };
    })
    .filter((line) => line.kind === "para" || !line.markerPending);
}

export function InventorySuperbotCard({
  organisation,
  venue,
  text,
  status,
  onRegenerate,
  className,
}: InventorySuperbotCardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const visibleLen = useSmoothReveal(text, reduceMotion);

  if (status === "idle" || status === "unavailable") {
    return null;
  }

  const streaming = status === "streaming";
  const visibleText = text.slice(0, visibleLen);
  const revealing = !reduceMotion && (streaming || visibleLen < text.length);
  const lines = splitBriefing(visibleText);

  // Fixed reading shape: one clamped prose block plus at most two action
  // rows, so the card's height stays predictable while streaming.
  const paraText = lines
    .filter((line) => line.kind === "para")
    .map((line) => line.text)
    .join(" ");
  const actions = lines
    .filter((line) => line.kind === "action")
    .slice(0, MAX_ACTION_ROWS);
  const lastLine = lines[lines.length - 1];
  const caretOnPara = revealing && lastLine?.kind === "para";
  const caretActionIndex =
    revealing && lastLine?.kind === "action" ? actions.length - 1 : -1;

  return (
    <Card
      className={cn(
        "relative min-h-[280px] gap-0 overflow-hidden py-0 shadow-sm",
        "border-emerald-200/80 bg-emerald-50/60",
        "dark:border-emerald-500/25 dark:bg-emerald-950/25",
        className,
      )}
    >
      <div
        aria-hidden
        className="superbot-suggestions-shifting-blobs pointer-events-none absolute inset-0 z-0"
      />
      <CardHeader className="relative z-10 flex flex-row items-center gap-3.5 space-y-0 px-5 pt-5 pb-3 md:px-6">
        <span className="relative flex size-11 shrink-0 items-center justify-center">
          <span className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-emerald-100 ring-1 ring-emerald-500/25 dark:bg-emerald-900/40">
            <AgentBotAvatarVideo
              aria-hidden
              poster="/images/supersolt-bot.png"
              className="h-full w-full"
            />
          </span>
          {streaming ? (
            <span
              className="absolute -right-0.5 -bottom-0.5 flex size-2.5"
              aria-hidden
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full border-2 border-background bg-emerald-500" />
            </span>
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-[15px] font-semibold tracking-tight">
            Superbot&apos;s read on your inventory
          </CardTitle>
          <CardDescription className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/70">
            {streaming ? "Analysing live" : "Live analysis"} · consumption
            engine
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-emerald-800/80 hover:bg-emerald-500/10 hover:text-emerald-900 dark:text-emerald-200/80 dark:hover:text-emerald-100"
          onClick={onRegenerate}
          disabled={streaming}
        >
          <RefreshCw className={cn("h-3 w-3", streaming && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="relative z-10 space-y-2 px-5 pt-0 pb-5 text-sm leading-relaxed md:px-6">
        {status === "error" ? (
          <p className="text-muted-foreground">
            Couldn&apos;t generate the briefing. Try refresh.
          </p>
        ) : lines.length === 0 ? (
          <p className="text-muted-foreground">
            Reading consumption facts, stock cover and open orders
            <StreamCaret />
          </p>
        ) : (
          <div className="space-y-2" aria-live="polite">
            {paraText ? (
              <p className="line-clamp-4">
                <DigestHighlightedLine line={paraText} />
                {caretOnPara ? <StreamCaret /> : null}
              </p>
            ) : null}
            {actions.map((line, index) => (
              <ActionRow
                key={index}
                organisation={organisation}
                venue={venue}
                destination={line.destination}
                caret={index === caretActionIndex ? <StreamCaret /> : null}
              >
                <DigestHighlightedLine line={line.text} />
              </ActionRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionRow({
  organisation,
  venue,
  destination,
  caret,
  children,
}: {
  organisation: string;
  venue: string;
  destination: AppNavigationDestinationKey | null;
  caret: React.ReactNode;
  children: React.ReactNode;
}) {
  const entry = destination ? APP_NAVIGATION_CATALOG[destination] : null;
  const Icon = destination ? getAppNavigationDestinationIcon(destination) : null;

  const rowClass = cn(
    "flex items-center gap-3 rounded-lg border border-emerald-600/15 bg-background/70 px-3 py-2.5 text-[13px] shadow-sm backdrop-blur-sm",
    "dark:border-emerald-400/15 dark:bg-emerald-950/40",
  );

  const inner = (
    <>
      {Icon ? (
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 transition-transform duration-300 group-hover:scale-110 dark:text-emerald-400"
        >
          <Icon className="size-4" />
        </span>
      ) : (
        <span
          aria-hidden
          className="mx-[13px] size-1.5 shrink-0 rounded-full bg-emerald-500"
        />
      )}
      <span className="min-w-0 flex-1">
        {children}
        {caret}
      </span>
      {entry ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap text-emerald-700 dark:text-emerald-300">
          {entry.title}
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </span>
      ) : null}
    </>
  );

  if (!entry) {
    return <p className={rowClass}>{inner}</p>;
  }

  return (
    <Link
      href={`/${organisation}/${venue}${entry.pathSuffix}`}
      className={cn(
        rowClass,
        "group transition-all duration-300 hover:-translate-y-px hover:border-emerald-500/40 hover:bg-background hover:shadow-md",
        "dark:hover:bg-emerald-950/60",
      )}
    >
      {inner}
    </Link>
  );
}

function StreamCaret() {
  return (
    <span
      aria-hidden
      className="ml-px inline-block h-[1.05em] w-px animate-pulse bg-emerald-700/60 align-middle dark:bg-emerald-300/60"
    />
  );
}
