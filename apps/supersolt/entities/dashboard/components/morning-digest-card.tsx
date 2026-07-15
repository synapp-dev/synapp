"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  CircleAlert,
  ClipboardList,
  Package,
  RefreshCw,
  Sparkles,
  Sunrise,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SupersoltSpinner } from "@/components/branding/supersolt-spinner";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { useMeStore } from "@/entities/me/model/store";
import {
  DigestHighlightedLine,
  DigestRichText,
} from "@/entities/dashboard/components/digest-rich-text";
import { parseDigestTabs } from "@/entities/dashboard/lib/parse-digest-tabs";
import type { DashboardDigestStatus } from "@/entities/dashboard/model/use-dashboard-digest";
import { useSmoothStreamText } from "@/entities/dashboard/model/use-smooth-stream-text";
import {
  APP_NAVIGATION_CATALOG,
  type AppNavigationDestinationKey,
} from "@/entities/ai-agent-chat/lib/app-navigation-catalog";
import { getAppNavigationDestinationIcon } from "@/entities/ai-agent-chat/lib/app-navigation-destination-icons";
import {
  buildSuperbotActionHref,
  isSuperbotFocusSlug,
  SUPERBOT_FOCUS_INTENTS,
  type SuperbotFocusSlug,
} from "@/entities/ai-agent-chat/lib/superbot-focus";

export type MorningDigestCardProps = {
  text: string;
  status: DashboardDigestStatus;
  /** Org/venue slugs for building action deep links. */
  organisationSlug: string;
  venueSlug: string;
  /** True when the digest came from the server cache: reveal it instantly. */
  fromCache?: boolean;
  onRegenerate: () => void;
  onAskAgent?: () => void;
  className?: string;
};

type DigestAction = {
  /** Resolved focus slug, or null while the marker is unknown. */
  slug: SuperbotFocusSlug | null;
  text: string;
  /** True while the "@slug" marker itself may still be streaming in. */
  markerPending: boolean;
};

/**
 * Splits the digest into its summary paragraph and "- @slug text" action lines.
 * The marker is only trusted once a space follows the slug (it may be mid-stream).
 */
function parseDigest(text: string): { paragraph: string; actions: DigestAction[] } {
  const paraLines: string[] = [];
  const actions: DigestAction[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.length === 0) continue;
    if (!line.startsWith("- ")) {
      paraLines.push(line);
      continue;
    }
    const body = line.slice(2);
    if (!body.startsWith("@")) {
      actions.push({ slug: null, text: body, markerPending: false });
      continue;
    }
    const spaceIndex = body.indexOf(" ");
    if (spaceIndex === -1) {
      actions.push({ slug: null, text: "", markerPending: true });
      continue;
    }
    const key = body.slice(1, spaceIndex);
    actions.push({
      slug: isSuperbotFocusSlug(key) ? key : null,
      text: body.slice(spaceIndex + 1),
      markerPending: false,
    });
  }

  return {
    paragraph: paraLines.join("\n"),
    actions: actions.filter((a) => !a.markerPending),
  };
}

/** Best-effort icon for a model-chosen tab title. */
function digestTabIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (/today|morning|now|open/.test(t)) return Sunrise;
  if (/sale|revenue|momentum|trade|trading|check/.test(t)) return TrendingUp;
  if (/stock|inventor|ingredient|supply|waste/.test(t)) return Package;
  if (/order|invoice|purchas|supplier|deliver/.test(t)) return ClipboardList;
  if (/labour|labor|staff|roster|team/.test(t)) return Users;
  if (/alert|risk|watch|attention/.test(t)) return CircleAlert;
  return Sparkles;
}

function tabValue(index: number): string {
  return `digest-tab-${index}`;
}

/** Ticks every second after mount; null until then (SSR-safe). */
function useLiveClock(): Date | null {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** The lead phrase renders thin; the name renders two sizes up. */
type GreetingParts = { lead: string; name: string | null; tail: string };

function buildGreeting(
  now: Date,
  firstName: string | null,
  nightOwlPick: number,
): GreetingParts {
  const hour = now.getHours();
  if (hour < 5) {
    const lines = ["Can't sleep", "Night owl, huh"];
    const lead = lines[nightOwlPick % lines.length]!;
    return firstName
      ? { lead: `${lead},`, name: firstName, tail: "?" }
      : { lead, name: null, tail: "?" };
  }
  const base =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return firstName
    ? { lead: `${base},`, name: firstName, tail: "" }
    : { lead: base, name: null, tail: "" };
}

function StreamingCaret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-4 w-[2px] animate-pulse rounded-full bg-emerald-600/70 align-middle dark:bg-emerald-300/70"
    />
  );
}

/** Replayed tab reveals run a little quicker than the live network stream. */
const TAB_REPLAY_SPEED = 2.5;

/** Dwell on each digest tab before auto-advancing to the next. */
const TAB_AUTO_ADVANCE_MS = 8000;

/**
 * One tab's content. When `stream` is true the pane replays the streaming
 * reveal from the start (tab switches, cached loads); otherwise it renders
 * the text it's given directly (the live network stream, already smoothed
 * upstream, or an instant settle).
 */
function DigestTabPane({
  tabText,
  stream,
  liveCaret,
  reduceMotion,
  organisationSlug,
  venueSlug,
}: {
  tabText: string;
  stream: boolean;
  /** Caret for the live network stream (trails the newest tab only). */
  liveCaret: boolean;
  reduceMotion: boolean;
  organisationSlug: string;
  venueSlug: string;
}) {
  const { visibleText, caughtUp } = useSmoothStreamText(
    tabText,
    reduceMotion || !stream,
    TAB_REPLAY_SPEED,
  );
  const { paragraph, actions } = React.useMemo(
    () => parseDigest(visibleText),
    [visibleText],
  );
  const caretVisible = stream ? !caughtUp : liveCaret;
  const caretOnActions = caretVisible && actions.length > 0;

  return (
    <>
      {paragraph.trim() ? (
        <DigestRichText
          text={paragraph}
          trailing={
            caretVisible && actions.length === 0 ? <StreamingCaret /> : null
          }
        />
      ) : null}
      {actions.length > 0 ? (
        <div className="space-y-2">
          {actions.map((action, actionIndex) => (
            <DigestActionCard
              key={actionIndex}
              organisationSlug={organisationSlug}
              venueSlug={venueSlug}
              slug={action.slug}
            >
              <DigestHighlightedLine line={action.text} />
              {caretOnActions && actionIndex === actions.length - 1 ? (
                <StreamingCaret />
              ) : null}
            </DigestActionCard>
          ))}
        </div>
      ) : null}
    </>
  );
}

function DigestActionCard({
  organisationSlug,
  venueSlug,
  slug,
  children,
}: {
  organisationSlug: string;
  venueSlug: string;
  slug: SuperbotFocusSlug | null;
  children: React.ReactNode;
}) {
  const destination: AppNavigationDestinationKey | null = slug
    ? SUPERBOT_FOCUS_INTENTS[slug].destination
    : null;
  const entry = destination ? APP_NAVIGATION_CATALOG[destination] : null;
  const Icon = destination ? getAppNavigationDestinationIcon(destination) : null;

  const rowClass = cn(
    "flex items-center gap-3 rounded-lg border border-emerald-600/15 bg-background/70 px-3 py-2.5 text-[13px] shadow-sm backdrop-blur-sm",
    "dark:border-emerald-400/15",
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
      <span className="min-w-0 flex-1">{children}</span>
      {entry ? (
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {entry.title}
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </span>
      ) : null}
    </>
  );

  if (!slug || !entry) {
    return <p className={rowClass}>{inner}</p>;
  }

  return (
    <Link
      href={buildSuperbotActionHref(organisationSlug, venueSlug, slug)}
      className={cn(
        rowClass,
        "group transition-all duration-300 hover:-translate-y-px hover:border-emerald-500/40 hover:bg-background hover:shadow-md",
      )}
    >
      {inner}
    </Link>
  );
}

export function MorningDigestCard({
  text,
  status,
  organisationSlug,
  venueSlug,
  fromCache = false,
  onRegenerate,
  onAskAgent,
  className,
}: MorningDigestCardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const { visibleText, caughtUp } = useSmoothStreamText(
    text,
    reduceMotion || fromCache,
  );

  // Live runs render the globally-smoothed stream; settled runs (cache hits,
  // finished streams) render the full text and let each tab replay its own
  // reveal when activated.
  const settled = fromCache || (status === "done" && caughtUp);
  const parsedTabs = React.useMemo(
    () => parseDigestTabs(settled ? text : visibleText),
    [settled, text, visibleText],
  );

  // Stay on the first tab while new ones stream in; the pulse dot on the
  // newest trigger shows where the digest is still writing.
  const [selected, setSelected] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (status === "streaming") {
      setSelected(null);
    }
  }, [status]);

  // Per-tab replay counters: bumping one re-runs that tab's streaming reveal.
  // Zero means "show instantly" — the tab that was just written live keeps
  // its content when the run settles instead of restarting.
  const [replays, setReplays] = React.useState<Record<string, number>>({});
  const handleTabChange = React.useCallback(
    (value: string) => {
      setSelected(value);
      if (settled && !reduceMotion) {
        setReplays((prev) => ({ ...prev, [value]: (prev[value] ?? 0) + 1 }));
      }
    },
    [settled, reduceMotion],
  );

  // Cache hits skip the live stream, so the first tab plays its reveal here.
  React.useEffect(() => {
    if (fromCache && !reduceMotion) {
      setReplays((prev) =>
        prev[tabValue(0)] ? prev : { ...prev, [tabValue(0)]: 1 },
      );
    }
  }, [fromCache, reduceMotion]);

  // Auto-advance: once the digest has settled, each tab dwells ~8s then hands
  // off to the next. Hovering the card pauses the countdown where it is (the
  // progress fill freezes via animation-play-state) and leaving resumes it
  // with whatever time was left; any tab change restarts the full dwell.
  const [hovered, setHovered] = React.useState(false);
  // Background tabs never paint, so the progress fill can't run there — hold
  // the timer as well or the two drift apart.
  const [pageHidden, setPageHidden] = React.useState(false);
  React.useEffect(() => {
    const onVisibility = () =>
      setPageHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const dwellPaused = hovered || pageHidden;
  const tabCount = parsedTabs.length;
  const activeValue = selected ?? tabValue(0);
  const cycling = settled && status !== "error" && tabCount > 1;
  const dwellRemainingRef = React.useRef(TAB_AUTO_ADVANCE_MS);
  const dwellStartedAtRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    dwellRemainingRef.current = TAB_AUTO_ADVANCE_MS;
  }, [activeValue, cycling]);

  React.useEffect(() => {
    if (!cycling || dwellPaused) return;
    dwellStartedAtRef.current = Date.now();
    const id = window.setTimeout(() => {
      dwellStartedAtRef.current = null;
      const current = Number(activeValue.slice("digest-tab-".length));
      const next = Number.isFinite(current) ? (current + 1) % tabCount : 0;
      handleTabChange(tabValue(next));
    }, dwellRemainingRef.current);
    return () => {
      window.clearTimeout(id);
      if (dwellStartedAtRef.current != null) {
        dwellRemainingRef.current = Math.max(
          0,
          dwellRemainingRef.current - (Date.now() - dwellStartedAtRef.current),
        );
        dwellStartedAtRef.current = null;
      }
    };
  }, [cycling, dwellPaused, activeValue, tabCount, handleTabChange]);

  const currentUser = useMeStore((state) => state.currentUser);
  const firstName =
    currentUser?.firstName ??
    currentUser?.fullName?.trim().split(/\s+/)[0] ??
    null;
  const now = useLiveClock();
  const [nightOwlPick] = React.useState(() => Math.floor(Math.random() * 2));
  const greeting = buildGreeting(now ?? new Date(), firstName, nightOwlPick);

  if (status === "idle" || status === "unavailable") {
    return null;
  }

  const revealing = status === "streaming" || (status === "done" && !caughtUp);
  const hasContent = parsedTabs.length > 0;
  const lastTabIndex = parsedTabs.length - 1;

  return (
    <Card
      className={cn(
        "relative h-full gap-4 border-emerald-200/70 bg-gradient-to-br from-emerald-50/60 via-background to-background",
        "dark:border-emerald-500/20 dark:from-emerald-950/25",
        className,
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-0">
        <span className="relative flex size-20 shrink-0 items-center justify-center">
          <AgentBotAvatarVideo
            aria-hidden
            poster="/images/supersolt-bot.png"
            className="h-full w-full"
          />
          {revealing ? (
            <span className="absolute right-1 bottom-1 flex size-3" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full border-2 border-background bg-emerald-500" />
            </span>
          ) : null}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <CardTitle className="truncate text-xl leading-tight tracking-tight sm:text-2xl">
            <span className="font-light">{greeting.lead}</span>
            {greeting.name ? (
              <span className="font-semibold"> {greeting.name}</span>
            ) : null}
            {greeting.tail ? (
              <span className="font-light">{greeting.tail}</span>
            ) : null}
          </CardTitle>
          {now ? (
            <CardDescription className="flex items-baseline gap-1.5 text-xs">
              <span className="font-medium tabular-nums text-foreground/80">
                {format(now, "h:mm:ss a")}
              </span>
              <span aria-hidden className="text-muted-foreground/60">
                ·
              </span>
              <span className="font-light text-muted-foreground">
                {format(now, "EEEE, d MMMM")}
              </span>
            </CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {status === "error" ? (
          <div className="animate-in fade-in flex items-center gap-3 duration-300">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Couldn&apos;t generate today&apos;s digest.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1.5 text-xs"
              onClick={onRegenerate}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
        ) : !hasContent ? (
          <div className="space-y-2" aria-hidden>
            <div className="h-3 w-2/5 animate-pulse rounded-full bg-emerald-500/10" />
            <div className="bg-muted h-3 w-4/5 animate-pulse rounded-full" />
            <div className="bg-muted h-3 w-3/5 animate-pulse rounded-full" />
          </div>
        ) : (
          <Tabs
            value={activeValue}
            onValueChange={handleTabChange}
            className="min-h-0 flex-1 gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <TabsList className="h-8 bg-emerald-500/[0.07]">
                {parsedTabs.map((tab, index) => {
                  const Icon = digestTabIcon(tab.title);
                  return (
                    <TabsTrigger
                      key={tabValue(index)}
                      value={tabValue(index)}
                      className={cn(
                        "relative h-full gap-1.5 overflow-hidden px-2.5 text-xs transition-all duration-200 data-[state=active]:bg-background",
                        !reduceMotion &&
                          "animate-in fade-in slide-in-from-bottom-1 duration-300",
                      )}
                    >
                      <Icon className="size-3.5 opacity-70" aria-hidden />
                      {tab.title}
                      {revealing && index === lastTabIndex ? (
                        <span
                          aria-hidden
                          className="size-1.5 animate-pulse rounded-full bg-emerald-500"
                        />
                      ) : null}
                      {cycling && tabValue(index) === activeValue ? (
                        // Auto-advance countdown: fills over the dwell, then
                        // the timer switches tabs. Freezes while the card is
                        // hovered; remounts (and restarts) on tab change.
                        <span
                          aria-hidden
                          className="animate-fill-x absolute inset-x-1 bottom-0 h-0.5 origin-left rounded-full bg-emerald-500/60"
                          style={{
                            animationDuration: `${TAB_AUTO_ADVANCE_MS}ms`,
                            animationPlayState: dwellPaused
                              ? "paused"
                              : "running",
                          }}
                        />
                      ) : null}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1.5 text-xs"
                onClick={onRegenerate}
                disabled={status === "streaming"}
              >
                <RefreshCw
                  className={cn(
                    "h-3 w-3",
                    status === "streaming" && "animate-spin",
                  )}
                />
                Refresh
              </Button>
            </div>
            {parsedTabs.map((tab, index) => (
              <TabsContent
                key={tabValue(index)}
                value={tabValue(index)}
                className={cn(
                  "space-y-3 text-sm leading-relaxed",
                  !reduceMotion &&
                    "animate-in fade-in slide-in-from-bottom-1 duration-300",
                )}
                aria-live="polite"
              >
                <DigestTabPane
                  key={
                    settled
                      ? `replay-${replays[tabValue(index)] ?? 0}`
                      : "live"
                  }
                  tabText={tab.text}
                  stream={
                    settled &&
                    (replays[tabValue(index)] ?? 0) > 0 &&
                    !reduceMotion
                  }
                  // While streaming, the caret trails the last thing written
                  // in the newest tab: its newest action row, or its paragraph.
                  liveCaret={revealing && index === lastTabIndex}
                  reduceMotion={reduceMotion}
                  organisationSlug={organisationSlug}
                  venueSlug={venueSlug}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {status === "done" && caughtUp && onAskAgent ? (
          <div
            className={cn(
              "mt-auto pt-1",
              !reduceMotion &&
                "animate-in fade-in slide-in-from-bottom-1 duration-500",
            )}
          >
            <Button size="sm" variant="outline" onClick={onAskAgent}>
              Ask the agent more
            </Button>
          </div>
        ) : null}
      </CardContent>

      {!reduceMotion ? (
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 bottom-2 hidden opacity-50 sm:block"
        >
          <SupersoltSpinner
            size={168}
            variant="mark"
            faceColor="transparent"
            strokeColor="#bcdb8b"
            strokeOpacity={0.9}
            strokeWidth={2}
          />
        </span>
      ) : null}
    </Card>
  );
}
