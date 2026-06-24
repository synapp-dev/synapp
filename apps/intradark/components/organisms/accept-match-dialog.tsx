"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";

import {
  useAcceptMatch,
  useMatch,
  type AcceptStatus,
  type MatchRosterPlayer,
} from "@/entities/match-queue/hooks/use-match";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";

const ACCEPT_WINDOW_SECONDS = 30;

/** ISO-3166 alpha-2 → regional-indicator emoji flag (best-effort; blank if unknown). */
function isoToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6;
  const cc = code.toUpperCase();
  return String.fromCodePoint(
    base + (cc.charCodeAt(0) - 65),
    base + (cc.charCodeAt(1) - 65),
  );
}

function StatusDot({ status }: { status: AcceptStatus }) {
  if (status === "accepted")
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/90">
        <Check className="size-3.5 text-white" strokeWidth={3} />
      </span>
    );
  if (status === "declined" || status === "timeout")
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-rose-500/90">
        <X className="size-3.5 text-white" strokeWidth={3} />
      </span>
    );
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-white/10">
      <Loader2 className="size-3.5 animate-spin text-white/60" />
    </span>
  );
}

function RosterCard({ p }: { p: MatchRosterPlayer }) {
  const initials = p.name.slice(0, 2).toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors",
        p.acceptStatus === "accepted"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : p.acceptStatus === "declined" || p.acceptStatus === "timeout"
            ? "border-rose-500/30 bg-rose-500/5"
            : "border-white/10 bg-white/[0.03]",
        p.isYou && "ring-1 ring-sidebar-primary/60",
      )}
    >
      <Avatar className="size-9 rounded-md">
        {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" className="object-cover" /> : null}
        <AvatarFallback className="rounded-md bg-zinc-800 text-xs font-bold text-white/70">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-semibold text-white">
          <span className="truncate">{p.name}</span>
          {p.isYou ? (
            <span className="shrink-0 text-[10px] font-bold uppercase text-sidebar-primary">
              you
            </span>
          ) : null}
        </p>
        <p className="truncate text-[11px] text-white/50">
          {isoToFlag(p.country)} {p.rating ?? "—"} ELO
        </p>
      </div>
      <StatusDot status={p.acceptStatus} />
    </div>
  );
}

export function AcceptMatchDialog({
  matchId,
  onResolved,
  onClose,
}: {
  matchId: string | null;
  /** Fired once when the match leaves pending_accept (accepted/cancelled). */
  onResolved?: (status: string) => void;
  /** Fired when the user dismisses the resolved dialog. */
  onClose?: () => void;
}) {
  const router = useRouter();
  const { data: match } = useMatch(matchId);
  const accept = useAcceptMatch(matchId);

  // Live countdown to the accept deadline.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (match?.status !== "pending_accept") return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [match?.status]);

  const resolvedFired = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!match) return;
    if (
      (match.status === "accepted" || match.status === "cancelled") &&
      resolvedFired.current !== match.matchId
    ) {
      resolvedFired.current = match.matchId;
      onResolved?.(match.status);
    }
  }, [match, onResolved]);

  if (!matchId || !match) return null;

  // Clamp to the window: clock skew between the browser and the server that stamped
  // the deadline can push this past 30s, which would blow past Progress's max.
  const secondsLeft = match.acceptDeadline
    ? Math.min(
        ACCEPT_WINDOW_SECONDS,
        Math.max(0, Math.ceil((new Date(match.acceptDeadline).getTime() - now) / 1000)),
      )
    : 0;
  const countdownPct = Math.max(
    0,
    Math.min(100, (secondsLeft / ACCEPT_WINDOW_SECONDS) * 100),
  );
  const pending = match.status === "pending_accept";
  const youDodged =
    match.you?.acceptStatus === "declined" || match.you?.acceptStatus === "timeout";

  const team1 = match.roster.filter((p) => p.team === 1);
  const team2 = match.roster.filter((p) => p.team === 2);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden border-white/10 bg-zinc-950 p-0"
        showCloseButton={!pending}
      >
        <DialogHeader className="space-y-0 border-b border-white/10 px-5 py-4">
          <DialogTitle className="flex items-center justify-between text-base">
            {pending ? (
              <>
                <span className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
                  </span>
                  Match Found — Ready Check
                </span>
                <span className="tabular-nums text-sm font-bold text-emerald-300">
                  {secondsLeft}s
                </span>
              </>
            ) : match.status === "accepted" ? (
              <span className="text-emerald-300">All players ready — match accepted ✓</span>
            ) : (
              <span className="text-rose-300">Match cancelled</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {pending ? (
          <Progress
            value={countdownPct}
            className="h-1 rounded-none bg-white/5 [&>div]:bg-emerald-500"
          />
        ) : null}

        <div className="px-5 py-4">
          <p className="mb-3 text-center text-xs text-white/50">
            {match.counts.accepted}/{match.counts.total} accepted
            {match.counts.declined > 0
              ? ` · ${match.counts.declined} declined`
              : ""}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-sky-300/80">
                Team A
              </p>
              {team1.map((p) => (
                <RosterCard key={p.steamid64} p={p} />
              ))}
            </div>
            <div className="space-y-2">
              <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-orange-300/80">
                Team B
              </p>
              {team2.map((p) => (
                <RosterCard key={p.steamid64} p={p} />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          {pending ? (
            match.you?.acceptStatus === "pending" ? (
              <div className="flex gap-3">
                <Button
                  className="h-11 flex-1 bg-emerald-600 text-base font-bold text-white hover:bg-emerald-500"
                  disabled={accept.isPending}
                  onClick={() => accept.mutate("accept")}
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  className="h-11 shrink-0 px-6"
                  disabled={accept.isPending}
                  onClick={() => accept.mutate("decline")}
                >
                  Decline
                </Button>
              </div>
            ) : (
              <p className="text-center text-sm text-white/60">
                {match.you?.acceptStatus === "accepted"
                  ? "You're ready — waiting for the rest of the lobby…"
                  : "Waiting…"}
              </p>
            )
          ) : match.status === "accepted" ? (
            <Button
              className="h-11 w-full bg-emerald-600 font-bold text-white hover:bg-emerald-500"
              onClick={() => router.push(`/match/${match.matchId}`)}
            >
              Enter match lobby →
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-white/70">
                {youDodged
                  ? "You didn't accept in time — a queue cooldown has been applied."
                  : "A player failed to accept. You've been returned to the queue."}
              </p>
              <Button
                variant="secondary"
                className="h-11 w-full"
                onClick={() => onClose?.()}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
