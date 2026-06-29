"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import type { FixtureRow } from "../lib/queries";

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

/** Admin fixtures panel: generate schedule, play a fixture, report a result. */
export function LeagueClient({
  stageId,
  fixtures,
}: {
  stageId: string;
  fixtures: FixtureRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {fixtures.length} fixtures
        </span>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              () => postJson(`/api/tournament/stages/${stageId}/schedule`),
              "Schedule generated.",
            )
          }
        >
          Generate schedule
        </Button>
      </div>

      {fixtures.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {fixtures.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>
                <span className="text-muted-foreground">R{f.round} </span>
                <span className="font-medium">{f.homeName ?? "TBD"}</span>
                <span className="text-muted-foreground"> vs </span>
                <span className="font-medium">{f.awayName ?? "TBD"}</span>
                <Badge variant="outline" className="ml-2">{f.status}</Badge>
              </span>
              <span className="flex gap-2">
                {!f.matchId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(() => postJson(`/api/tournament/fixtures/${f.id}/play`), "Match created.")
                    }
                  >
                    Play
                  </Button>
                ) : f.status !== "completed" ? (
                  <>
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            postJson(`/api/tournament/matches/${f.matchId}/result`, {
                              winnerTeam: 1,
                              scoreTeam1: 13,
                              scoreTeam2: 7,
                            }),
                          "Home win recorded.",
                        )
                      }
                    >
                      Home won
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            postJson(`/api/tournament/matches/${f.matchId}/result`, {
                              winnerTeam: 2,
                              scoreTeam1: 7,
                              scoreTeam2: 13,
                            }),
                          "Away win recorded.",
                        )
                      }
                    >
                      Away won
                    </Button>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No fixtures yet — generate the schedule once entrants are registered.
        </p>
      )}
    </div>
  );
}
