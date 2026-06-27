import { createBrowserClient } from "@/utils/supabase/client";
import { resolveTeamAvatarUrl } from "@/entities/teams/lib/avatar-url";

/** A team as joined into a listing/scrim/challenge row. */
export type TeamJoin = {
  id: string;
  name: string;
  avatar: string | null;
  tier_id: string | null;
};

export type ListingItem = {
  type: "listing";
  id: string;
  team_id: string;
  timeslot: string;
  min_tier_id: string | null;
  region_id: string | null;
  active: boolean;
  team: TeamJoin | null;
  scrim_listing_maps: { map_id: string }[];
};

export type ScrimItem = {
  type: "scrim";
  id: string;
  home_team_id: string;
  away_team_id: string;
  map_id: string | null;
  match_time: string;
  active: boolean;
  home_team: TeamJoin | null;
  away_team: TeamJoin | null;
};

export type TimeslotItem = ListingItem | ScrimItem;

export type ChallengeItem = {
  id: string;
  scrim_listing_id: string;
  team_id: string;
  active: boolean;
  team: TeamJoin | null;
  scrim_challenge_maps: { map_id: string }[];
};

const TEAM_SELECT = "id, name, avatar, tier_id";

/** Resolve a joined team's stored avatar path to a public URL in place. */
function resolveTeamJoin<T extends { avatar: string | null }>(team: T | null): T | null {
  if (!team) return team;
  return { ...team, avatar: resolveTeamAvatarUrl(team.avatar) };
}

function dateRange(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - 2);
  const end = new Date(date);
  end.setDate(end.getDate() + 2);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Group listings + scrims by their timeslot/match_time. */
function groupByTimeslot(items: TimeslotItem[]): Record<string, TimeslotItem[]> {
  return items.reduce<Record<string, TimeslotItem[]>>((acc, cur) => {
    const key = cur.type === "scrim" ? cur.match_time : cur.timeslot;
    (acc[key] ??= []).push(cur);
    return acc;
  }, {});
}

/** A single team's own listings + scrims around a date (Home calendar). */
export async function fetchTeamListings(
  teamId: string,
  date: Date,
): Promise<Record<string, TimeslotItem[]>> {
  const supabase = createBrowserClient();
  const { start, end } = dateRange(date);

  const [{ data: listings }, { data: scrimRows }] = await Promise.all([
    supabase
      .from("scrim_listings")
      .select(`*, scrim_listing_maps ( map_id )`)
      .eq("team_id", teamId)
      .eq("active", true)
      .gte("timeslot", start)
      .lte("timeslot", end),
    supabase
      .from("scrims")
      .select(
        `*, home_team:home_team_id ( ${TEAM_SELECT} ), away_team:away_team_id ( ${TEAM_SELECT} )`,
      )
      .eq("active", true)
      .gte("match_time", start)
      .lte("match_time", end)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`),
  ]);

  const items: TimeslotItem[] = [
    ...((listings ?? []) as ListingItem[]).map((l) => ({
      ...l,
      type: "listing" as const,
      team: resolveTeamJoin(l.team),
    })),
    ...((scrimRows ?? []) as ScrimItem[]).map((s) => ({
      ...s,
      type: "scrim" as const,
      home_team: resolveTeamJoin(s.home_team),
      away_team: resolveTeamJoin(s.away_team),
    })),
  ];
  return groupByTimeslot(items);
}

/** Every active listing + the viewer team's scrims around a date (All Listings). */
export async function fetchAllListings(
  myTeamId: string,
  date: Date,
): Promise<Record<string, TimeslotItem[]>> {
  const supabase = createBrowserClient();
  const { start, end } = dateRange(date);

  const [{ data: listings }, { data: scrimRows }] = await Promise.all([
    supabase
      .from("scrim_listings")
      .select(`*, team:team_id ( ${TEAM_SELECT} ), scrim_listing_maps ( map_id )`)
      .eq("active", true)
      .gte("timeslot", start)
      .lte("timeslot", end),
    supabase
      .from("scrims")
      .select(
        `*, home_team:home_team_id ( ${TEAM_SELECT} ), away_team:away_team_id ( ${TEAM_SELECT} )`,
      )
      .eq("active", true)
      .gte("match_time", start)
      .lte("match_time", end)
      .or(`home_team_id.eq.${myTeamId},away_team_id.eq.${myTeamId}`),
  ]);

  const items: TimeslotItem[] = [
    ...((listings ?? []) as ListingItem[]).map((l) => ({
      ...l,
      type: "listing" as const,
      team: resolveTeamJoin(l.team),
    })),
    ...((scrimRows ?? []) as ScrimItem[]).map((s) => ({
      ...s,
      type: "scrim" as const,
      home_team: resolveTeamJoin(s.home_team),
      away_team: resolveTeamJoin(s.away_team),
    })),
  ];
  return groupByTimeslot(items);
}

/** Active challenges submitted to a listing (listing owner view). */
export async function fetchListingChallenges(
  listingId: string,
): Promise<ChallengeItem[]> {
  const supabase = createBrowserClient();
  const { data } = await supabase
    .from("scrim_challenges")
    .select(`*, team:team_id ( ${TEAM_SELECT} ), scrim_challenge_maps ( map_id )`)
    .eq("active", true)
    .eq("scrim_listing_id", listingId);
  return ((data ?? []) as ChallengeItem[]).map((c) => ({
    ...c,
    team: resolveTeamJoin(c.team),
  }));
}

/** The viewer team's own active challenge against a listing, if any. */
export async function fetchMyChallenge(
  listingId: string,
  teamId: string,
): Promise<ChallengeItem | null> {
  const supabase = createBrowserClient();
  const { data } = await supabase
    .from("scrim_challenges")
    .select(`*, team:team_id ( ${TEAM_SELECT} ), scrim_challenge_maps ( map_id )`)
    .eq("active", true)
    .eq("team_id", teamId)
    .eq("scrim_listing_id", listingId)
    .maybeSingle();
  const challenge = (data as ChallengeItem | null) ?? null;
  return challenge ? { ...challenge, team: resolveTeamJoin(challenge.team) } : null;
}

// --- Writes (atomic RPCs) ------------------------------------------------

export async function createListing(args: {
  teamId: string;
  minTierId: string | null;
  regionId: string | null;
  timeslot: string;
  mapIds: string[];
}): Promise<{ error: string | null }> {
  const supabase = createBrowserClient();
  const { error } = await supabase.rpc("insert_scrim_and_maps", {
    team_id: args.teamId,
    tier_id: args.minTierId,
    timeslot: args.timeslot,
    region_id: args.regionId,
    map_ids: args.mapIds,
  });
  return { error: error?.message ?? null };
}

export async function submitChallenge(args: {
  listingId: string;
  teamId: string;
  mapIds: string[];
}): Promise<{ error: string | null; code?: string }> {
  const supabase = createBrowserClient();
  const { error } = await supabase.rpc("insert_challenge_and_maps", {
    scrim_listing_id: args.listingId,
    team_id: args.teamId,
    map_ids: args.mapIds,
  });
  return { error: error?.message ?? null, code: error?.code };
}

export async function acceptChallenge(args: {
  challengeId: string;
  mapId: string;
}): Promise<{ error: string | null; scrimId: string | null }> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.rpc("accept_challenge", {
    challenge_id: args.challengeId,
    map_id: args.mapId,
  });
  return { error: error?.message ?? null, scrimId: (data as string | null) ?? null };
}

export async function cancelChallenge(challengeId: string): Promise<{ error: string | null }> {
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from("scrim_challenges")
    .update({ active: false })
    .eq("id", challengeId);
  return { error: error?.message ?? null };
}

export async function cancelListing(listingId: string): Promise<{ error: string | null }> {
  const supabase = createBrowserClient();
  const { error } = await supabase
    .from("scrim_listings")
    .update({ active: false })
    .eq("id", listingId);
  return { error: error?.message ?? null };
}
