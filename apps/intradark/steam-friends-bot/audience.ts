/**
 * Resolves a `broadcast` job into (recipients, message). Audience is computed at
 * send time so prefs/friendships are always current. The message text is uniform
 * across recipients (no per-user personalization for v1).
 */

import { BotDb, type DmJob, type PrefColumn } from "./db.js";
import * as msg from "./messages.js";

export interface ResolvedBroadcast {
  text: string;
  recipients: string[];
}

export async function resolveBroadcast(
  db: BotDb,
  job: DmJob,
): Promise<ResolvedBroadcast | null> {
  const audience = String(job.payload.audience ?? "");
  switch (audience) {
    case "news":
      return resolveNews(db, job);
    case "broadcast":
      return resolveAdminBroadcast(db, job);
    case "scrim_listing":
      return resolveScrimListing(db, job);
    case "scrim_challenge":
      return resolveScrimChallenge(db, job);
    case "scrim_accepted":
      return resolveScrimAccepted(db, job);
    default:
      console.warn(`[audience] unknown audience '${audience}' for job ${job.id}`);
      return null;
  }
}

async function resolveNews(db: BotDb, job: DmJob): Promise<ResolvedBroadcast | null> {
  const articleId = String(job.payload.article_id ?? "");
  if (!articleId) return null;
  const { data } = await db
    .raw()
    .from("news_articles")
    .select("title, excerpt, slug")
    .eq("id", articleId)
    .maybeSingle();
  const a = data as { title: string; excerpt: string | null; slug: string } | null;
  if (!a) return null;
  const recipients = await db.eligibleRecipients(
    await db.allActiveFriendSteamIds(),
    "notify_news",
  );
  return { text: msg.newsArticle(a.title, a.excerpt, a.slug), recipients };
}

async function resolveAdminBroadcast(
  db: BotDb,
  job: DmJob,
): Promise<ResolvedBroadcast | null> {
  const body = String(job.payload.body ?? "").trim();
  if (!body) return null;
  const link = job.payload.link ? String(job.payload.link) : null;
  const onlySteamId = job.payload.test_steamid64
    ? String(job.payload.test_steamid64)
    : null;
  const candidates = onlySteamId
    ? [onlySteamId]
    : await db.allActiveFriendSteamIds();
  const recipients = await db.eligibleRecipients(candidates, "notify_broadcast");
  return { text: msg.broadcast(body, link), recipients };
}

async function resolveScrimListing(
  db: BotDb,
  job: DmJob,
): Promise<ResolvedBroadcast | null> {
  const teamId = String(job.payload.team_id ?? "");
  const regionId = job.payload.region_id ? String(job.payload.region_id) : null;
  const listingId = String(job.payload.listing_id ?? "");
  if (!teamId) return null;

  // Candidate teams: same region (when set), excluding the posting team.
  // (Tier filtering is a later refinement — see plan §7 caveat.)
  let q = db.raw().from("teams").select("id, name").neq("id", teamId);
  if (regionId) q = q.eq("region_id", regionId);
  const { data: teams } = await q;
  const teamIds = ((teams ?? []) as { id: string }[]).map((t) => t.id);

  const candidates = await teamMembers(db, teamIds);
  const recipients = await db.eligibleRecipients(candidates, "notify_scrim");

  const postingName = await teamName(db, teamId);
  const timeslot = listingId ? await listingTimeslot(db, listingId) : null;
  return { text: msg.scrimListing(postingName, timeslot), recipients };
}

async function resolveScrimChallenge(
  db: BotDb,
  job: DmJob,
): Promise<ResolvedBroadcast | null> {
  const listingId = String(job.payload.listing_id ?? "");
  const challengerTeamId = String(job.payload.challenger_team_id ?? "");
  if (!listingId) return null;

  const { data: listing } = await db
    .raw()
    .from("scrim_listings")
    .select("team_id")
    .eq("id", listingId)
    .maybeSingle();
  const ownerTeamId = (listing as { team_id: string } | null)?.team_id;
  if (!ownerTeamId) return null;

  const candidates = await teamMembers(db, [ownerTeamId]);
  const recipients = await db.eligibleRecipients(candidates, "notify_scrim");
  const challengerName = await teamName(db, challengerTeamId);
  return { text: msg.scrimChallengeReceived(challengerName), recipients };
}

async function resolveScrimAccepted(
  db: BotDb,
  job: DmJob,
): Promise<ResolvedBroadcast | null> {
  const notifyTeamId = String(job.payload.notify_team_id ?? "");
  const homeTeamId = String(job.payload.home_team_id ?? "");
  const matchTime = job.payload.match_time ? String(job.payload.match_time) : null;
  if (!notifyTeamId) return null;

  const candidates = await teamMembers(db, [notifyTeamId]);
  const recipients = await db.eligibleRecipients(candidates, "notify_scrim");
  const opponentName = await teamName(db, homeTeamId);
  return { text: msg.scrimAccepted(opponentName, matchTime), recipients };
}

// --- helpers -----------------------------------------------------------------

async function teamMembers(db: BotDb, teamIds: string[]): Promise<string[]> {
  if (teamIds.length === 0) return [];
  const { data } = await db
    .raw()
    .from("player_teams")
    .select("steamid64")
    .in("team_id", teamIds);
  return (data ?? []).map((r: { steamid64: string }) => r.steamid64);
}

async function teamName(db: BotDb, teamId: string): Promise<string> {
  if (!teamId) return "A team";
  const { data } = await db
    .raw()
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .maybeSingle();
  return (data as { name: string } | null)?.name ?? "A team";
}

async function listingTimeslot(db: BotDb, listingId: string): Promise<string | null> {
  const { data } = await db
    .raw()
    .from("scrim_listings")
    .select("timeslot")
    .eq("id", listingId)
    .maybeSingle();
  return (data as { timeslot: string } | null)?.timeslot ?? null;
}

export type { PrefColumn };
