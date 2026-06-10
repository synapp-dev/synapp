import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

import { PlayerSearch } from "@/entities/players/components/player-search";
import { canonicalPath } from "@/entities/players/lib/resolve";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type LinkedProfile = {
  username: string | null;
  display_name: string | null;
} | null;

type PlayerRow = {
  steamid64: number;
  user_profile_id: string | null;
  faceit_nickname: string | null;
  first_seen_at: string;
  user_profiles: LinkedProfile;
};

function rowLabel(row: PlayerRow): string {
  return (
    row.user_profiles?.display_name ||
    row.user_profiles?.username ||
    row.faceit_nickname ||
    String(row.steamid64)
  );
}

function PlayerCardLink({ row }: { row: PlayerRow }) {
  const username = row.user_profiles?.username ?? null;
  return (
    <Link
      href={canonicalPath(String(row.steamid64), username)}
      className="rounded-lg border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{rowLabel(row)}</span>
        {username ? (
          <Badge className="shrink-0">@{username}</Badge>
        ) : (
          <Badge variant="outline" className="shrink-0">
            Unclaimed
          </Badge>
        )}
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground tabular-nums">
        {row.steamid64}
      </p>
    </Link>
  );
}

export default async function PlayersPage() {
  const admin = createAdminClient();
  const select =
    "steamid64, user_profile_id, faceit_nickname, first_seen_at, user_profiles:user_profile_id(username, display_name)";

  const [claimedRes, recentRes] = await Promise.all([
    admin
      .from("players")
      .select(select)
      .not("user_profile_id", "is", null)
      .order("first_seen_at", { ascending: false })
      .limit(24),
    admin
      .from("players")
      .select(select)
      .order("first_seen_at", { ascending: false })
      .limit(24),
  ]);

  const claimed = (claimedRes.data ?? []) as unknown as PlayerRow[];
  const recent = (recentRes.data ?? []) as unknown as PlayerRow[];

  return (
    <div className="space-y-8 py-2">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Players</h1>
        <p className="text-sm text-muted-foreground">
          Look up any CS2 player by intradark name, SteamID64, Steam URL, or
          Faceit nickname.
        </p>
        <PlayerSearch />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
          {claimed.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {claimed.map((row) => (
                <PlayerCardLink key={row.steamid64} row={row} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No claimed players yet. Members appear here once they link Steam.
            </p>
          )}
        </CardContent>
      </Card>

      {recent.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently looked up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((row) => (
                <PlayerCardLink key={row.steamid64} row={row} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
