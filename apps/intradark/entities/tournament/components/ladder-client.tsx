"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createBrowserClient } from "@/utils/supabase/client";

import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import type { LadderChallengeRow } from "../lib/queries";
import type { LadderRow } from "../types";

interface Props {
  stageId: string | null;
  rows: LadderRow[];
  challenges: LadderChallengeRow[];
  challengeRange: number;
  /** Admin can issue/accept/decline/report; others see a read-only ladder. */
  canManage: boolean;
}

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export function LadderClient({
  stageId,
  rows,
  challenges,
  challengeRange,
  canManage,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [challenger, setChallenger] = useState<string>("");
  const [challenged, setChallenged] = useState<string>("");

  // Live: refresh the ladder when positions or challenges change.
  useEffect(() => {
    if (!stageId) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`ladder:${stageId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "competition_challenges" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "competition_entrants" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "competition_standings" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [stageId, router]);

  const rankById = useMemo(
    () => new Map(rows.map((r) => [r.entrantId, r.rank ?? Infinity])),
    [rows],
  );

  // Valid targets for the chosen challenger: up to `range` positions above.
  const validTargets = useMemo(() => {
    if (!challenger) return [];
    const cr = rankById.get(challenger) ?? Infinity;
    return rows.filter((r) => {
      const tr = r.rank ?? Infinity;
      return tr < cr && cr - tr <= challengeRange;
    });
  }, [challenger, rankById, rows, challengeRange]);

  function run(fn: () => Promise<unknown>, okMsg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(okMsg);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function issue() {
    if (!stageId || !challenger || !challenged) {
      toast.error("Pick a challenger and a target.");
      return;
    }
    run(
      () =>
        postJson("/api/tournament/challenges", {
          stageId,
          challengerEntrantId: challenger,
          challengedEntrantId: challenged,
        }),
      "Challenge issued.",
    );
    setChallenged("");
  }

  return (
    <div className="space-y-6">
      {canManage && stageId ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Challenger</span>
            <Select value={challenger} onValueChange={(v) => { setChallenger(v); setChallenged(""); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                {rows.map((r) => (
                  <SelectItem key={r.entrantId} value={r.entrantId}>
                    #{r.rank} {r.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              Challenge (up to {challengeRange} above)
            </span>
            <Select value={challenged} onValueChange={setChallenged} disabled={!challenger}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Target" /></SelectTrigger>
              <SelectContent>
                {validTargets.map((r) => (
                  <SelectItem key={r.entrantId} value={r.entrantId}>
                    #{r.rank} {r.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={issue} disabled={pending || !challenged}>
            Issue challenge
          </Button>
        </div>
      ) : null}

      {challenges.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Active challenges</h3>
          <ul className="divide-y rounded-lg border">
            {challenges.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span>
                  <span className="font-medium">{c.challengerName}</span>
                  <span className="text-muted-foreground"> challenges </span>
                  <span className="font-medium">{c.challengedName}</span>
                  <Badge variant="outline" className="ml-2">{c.status}</Badge>
                </span>
                {canManage ? (
                  <span className="flex gap-2">
                    {c.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(() => postJson(`/api/tournament/challenges/${c.id}/accept`), "Accepted.")
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            run(() => postJson(`/api/tournament/challenges/${c.id}/decline`), "Forfeited.")
                          }
                        >
                          Forfeit
                        </Button>
                      </>
                    ) : null}
                    {c.status === "accepted" && c.matchId ? (
                      <>
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () =>
                                postJson(`/api/tournament/matches/${c.matchId}/result`, {
                                  winnerTeam: 1,
                                  scoreTeam1: 13,
                                  scoreTeam2: 0,
                                }),
                              "Reported: challenger win.",
                            )
                          }
                        >
                          Challenger won
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () =>
                                postJson(`/api/tournament/matches/${c.matchId}/result`, {
                                  winnerTeam: 2,
                                  scoreTeam1: 0,
                                  scoreTeam2: 13,
                                }),
                              "Reported: defender win.",
                            )
                          }
                        >
                          Defender won
                        </Button>
                      </>
                    ) : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="w-24 text-right">Players</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                No teams on the ladder yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.entrantId}>
                <TableCell className="font-mono font-semibold">{r.rank ?? "—"}</TableCell>
                <TableCell>{r.displayName}</TableCell>
                <TableCell className="text-right text-muted-foreground">{r.memberCount}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
