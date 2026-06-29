import { eq } from "drizzle-orm";

import { checkBearer } from "@/lib/cs2-ingest-auth";
import { db } from "@/server/db/drizzle";
import {
  matchPlayers,
  matches,
  steamProfiles,
} from "@/server/db/schema";

/**
 * MatchZy `loadmatch_url` target (PUG plan §3). The game server fetches this via
 * RCON `matchzy_loadmatch_url`, getting rosters/map/team-names + the result
 * callback. `matchid` = matches.id so the /api/cs2/events ingest can correlate.
 *
 * Auth: Bearer ${CS2_EVENTS_SECRET} (interim — a per-match token is the planned
 * hardening). Fails closed if the secret is unset.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = checkBearer(
    req.headers.get("authorization"),
    process.env.CS2_EVENTS_SECRET,
  );
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const [match] = await db
    .select({
      id: matches.id,
      map: matches.map,
      team1Name: matches.team1Name,
      team2Name: matches.team2Name,
    })
    .from(matches)
    .where(eq(matches.id, id))
    .limit(1);
  if (!match) return Response.json({ error: "Match not found" }, { status: 404 });

  const roster = await db
    .select({
      steamid64: matchPlayers.steamid64,
      team: matchPlayers.team,
      name: steamProfiles.personaname,
    })
    .from(matchPlayers)
    .leftJoin(steamProfiles, eq(steamProfiles.steamid64, matchPlayers.steamid64))
    .where(eq(matchPlayers.matchId, id));

  const team = (n: 1 | 2): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const r of roster) {
      if (r.team === n) out[r.steamid64] = r.name ?? r.steamid64;
    }
    return out;
  };

  const team1Players = team(1);
  const team2Players = team(2);
  const perTeam = Math.max(
    Object.keys(team1Players).length,
    Object.keys(team2Players).length,
    1,
  );
  const map = match.map ?? "de_mirage";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const secret = process.env.CS2_EVENTS_SECRET ?? "";

  return Response.json({
    matchid: match.id,
    num_maps: 1,
    players_per_team: perTeam,
    clinch_series: true,
    maplist: [map],
    map_sides: ["knife"],
    team1: { name: match.team1Name ?? "Team 1", players: team1Players },
    team2: { name: match.team2Name ?? "Team 2", players: team2Players },
    cvars: {
      matchzy_remote_log_url: `${base}/api/cs2/events`,
      matchzy_remote_log_header_key: "Authorization",
      matchzy_remote_log_header_value: `Bearer ${secret}`,
    },
  });
}
