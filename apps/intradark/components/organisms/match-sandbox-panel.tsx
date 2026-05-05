"use client";

import * as React from "react";
import { Loader2, Radio, Trash2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

const SNOWFLAKE = /^\d{17,20}$/;

type RosterEntry = { id: string; side: "A" | "B" };

export function MatchSandboxPanel() {
  const [team1Name, setTeam1Name] = React.useState("");
  const [team2Name, setTeam2Name] = React.useState("");
  const [discordIdInput, setDiscordIdInput] = React.useState("");
  const [addSide, setAddSide] = React.useState<"A" | "B">("A");
  const [roster, setRoster] = React.useState<RosterEntry[]>([]);

  const [botStatus, setBotStatus] = React.useState<
    "idle" | "checking" | "up" | "down"
  >("idle");
  const [botDetail, setBotDetail] = React.useState<string | null>(null);

  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const checkBot = React.useCallback(async () => {
    setBotStatus("checking");
    setBotDetail(null);
    try {
      const res = await fetch("/api/discord/bot/health", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        ready?: boolean;
        tag?: string | null;
        error?: string;
      };
      if (res.ok && data.ready) {
        setBotStatus("up");
        setBotDetail(data.tag ?? "online");
      } else {
        setBotStatus("down");
        setBotDetail(data.error ?? "not ready");
      }
    } catch (e) {
      setBotStatus("down");
      setBotDetail(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const addPlayer = React.useCallback(() => {
    setMessage(null);
    const id = discordIdInput.trim();
    if (!SNOWFLAKE.test(id)) {
      setMessage("Discord user id must be a 17–20 digit snowflake.");
      return;
    }
    if (roster.some((r) => r.id === id)) {
      setMessage("That user is already on the roster.");
      return;
    }
    setRoster((r) => [...r, { id, side: addSide }]);
    setDiscordIdInput("");
  }, [discordIdInput, addSide, roster]);

  const removePlayer = React.useCallback((id: string) => {
    setRoster((r) => r.filter((x) => x.id !== id));
  }, []);

  const startMatch = React.useCallback(async () => {
    setMessage(null);
    const t1 = team1Name.trim();
    const t2 = team2Name.trim();
    if (!t1 || !t2) {
      setMessage("Enter both team names.");
      return;
    }
    setBusy("start");
    try {
      const teamAUserIds = roster.filter((x) => x.side === "A").map((x) => x.id);
      const teamBUserIds = roster.filter((x) => x.side === "B").map((x) => x.id);
      const res = await fetch("/api/discord/bot/match/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team1Name: t1,
          team2Name: t2,
          teamAUserIds,
          teamBUserIds,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? `Start failed (${res.status})`);
        return;
      }
      setMessage("Match channels created in Discord. Join the lobby voice channel to test automove.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [team1Name, team2Name, roster]);

  const endMatch = React.useCallback(async () => {
    setMessage(null);
    setBusy("end");
    try {
      const res = await fetch("/api/discord/bot/match/end", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? `End failed (${res.status})`);
        return;
      }
      setMessage("Practice channels removed.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Discord match sandbox</CardTitle>
        <CardDescription>
          Run the bot locally ({`pnpm discord-bot`} in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            apps/intradark
          </code>
          ) with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            DISCORD_BOT_HTTP_SECRET
          </code>{" "}
          set in both{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            .env.local
          </code>{" "}
          and the same value for the bot process. Then check status and start a
          match.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void checkBot()}
            disabled={botStatus === "checking"}
          >
            {botStatus === "checking" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Radio className="size-4" aria-hidden />
            )}
            Check bot
          </Button>
          {botStatus === "up" && (
            <span className="text-xs font-medium text-emerald-600">
              Reachable{botDetail ? ` · ${botDetail}` : ""}
            </span>
          )}
          {botStatus === "down" && (
            <span className="text-xs text-muted-foreground">
              Unreachable{botDetail ? ` · ${botDetail}` : ""}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="team1">Team 1 (voice channel + roster side A)</Label>
            <Input
              id="team1"
              value={team1Name}
              onChange={(e) => setTeam1Name(e.target.value)}
              placeholder="e.g. Falcons"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team2">Team 2 (voice channel + roster side B)</Label>
            <Input
              id="team2"
              value={team2Name}
              onChange={(e) => setTeam2Name(e.target.value)}
              placeholder="e.g. NAVI"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Add player (Discord user ID)</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              value={discordIdInput}
              onChange={(e) => setDiscordIdInput(e.target.value)}
              placeholder="17–20 digit snowflake"
              className="font-mono text-sm sm:max-w-xs"
              autoComplete="off"
            />
            <Select
              value={addSide}
              onValueChange={(v) => setAddSide(v as "A" | "B")}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Team 1 (A)</SelectItem>
                <SelectItem value="B">Team 2 (B)</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" onClick={addPlayer}>
              Add
            </Button>
          </div>
        </div>

        {roster.length > 0 && (
          <ul className="space-y-2 rounded-md border border-border/80 bg-muted/30 p-3 text-sm">
            {roster.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 font-mono text-xs"
              >
                <span>
                  <span className="text-muted-foreground">
                    Team {r.side === "A" ? "1" : "2"} ·{" "}
                  </span>
                  {r.id}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => removePlayer(r.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {message && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {message}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          onClick={() => void startMatch()}
          disabled={busy !== null}
        >
          {busy === "start" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Start match (create Discord channels)
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void endMatch()}
          disabled={busy !== null}
        >
          {busy === "end" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          End match (delete channels)
        </Button>
      </CardFooter>
    </Card>
  );
}
