"use server";

import { track } from "@vercel/analytics/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { allocateUniqueUrlSlug } from "@/entities/content/lib/slug";
import { formatZodActionError } from "@/entities/content/lib/format-zod-error";
import { isPostgresUniqueViolation } from "@/entities/content/lib/postgres-errors";
import { ensurePlayer } from "@/entities/players/lib/server/registry";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { db } from "@/server/db/drizzle";
import { playerTeams, teams } from "@/server/db/schema";
import { createAdminClient } from "@/utils/supabase/admin";

import type { TeamActionResult } from "./lib/action-types";
import { isTeamLeader } from "./lib/leader";
import { getTeamById, isTeamSlugTaken } from "./lib/queries";
import { createTeamSchema, setTeamAvatarSchema, updateTeamSchema } from "./lib/schemas";
import { slugifyTeamName, validateTeamSlug } from "./lib/slug";
import { assertTeamAvatarObjectPath } from "@/lib/media/team-avatar-path";
import { validateMediaObjectPath } from "@/lib/media/storage-paths";

async function requireLinkedSteam(): Promise<
  TeamActionResult<{ steamid64: string }>
> {
  const viewer = await getCurrentUserProfiles();
  if (!viewer) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in required." };
  }
  const steamid64 = viewer.userProfile.steam_profile_id;
  if (!steamid64) {
    return {
      ok: false,
      code: "STEAM_REQUIRED",
      message: "Link your Steam account before managing teams.",
    };
  }
  return { ok: true, data: { steamid64 } };
}

async function allocateTeamSlug(preferred: string): Promise<string> {
  return allocateUniqueUrlSlug({
    preferred,
    slugify: slugifyTeamName,
    validate: validateTeamSlug,
    isTaken: isTeamSlugTaken,
    skipInvalid: true,
  });
}

async function trackTeamEvent(event: "team_created" | "team_updated") {
  try {
    const h = await headers();
    await track(event, { ok: true }, { request: { headers: h } });
  } catch (e) {
    console.warn("[teams] analytics track failed", e);
  }
}

export async function createTeamAction(input: {
  name: string;
  slug?: string;
  nickname?: string;
  description?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}): Promise<TeamActionResult<{ slug: string; teamId: string }>> {
  const gate = await requireLinkedSteam();
  if (!gate.ok) return gate;

  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { name, slug: slugInput, nickname, description, primaryColor, secondaryColor } =
    parsed.data;

  const baseSlug =
    slugInput && slugInput.length > 0 ? slugInput : slugifyTeamName(name);
  const slugFirst = validateTeamSlug(baseSlug).ok
    ? baseSlug
    : slugifyTeamName(name);
  const slugFinal = await allocateTeamSlug(slugFirst);

  const admin = createAdminClient();
  await ensurePlayer(admin, gate.data.steamid64);

  const now = new Date().toISOString();

  try {
    const result = await db.transaction(async (tx) => {
      const [team] = await tx
        .insert(teams)
        .values({
          name,
          slug: slugFinal,
          nickname: nickname ?? null,
          description: description ?? null,
          primaryColor: primaryColor ?? null,
          secondaryColor: secondaryColor ?? null,
          avatar: null,
          leaderSteamid64: gate.data.steamid64,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: teams.id, slug: teams.slug });

      if (!team) {
        throw new Error("insert_failed");
      }

      await tx.insert(playerTeams).values({
        teamId: team.id,
        steamid64: gate.data.steamid64,
        role: "leader",
        joinedAt: now,
      });

      return team;
    });

    revalidatePath("/teams");
    revalidatePath(`/teams/${result.slug}`);
    await trackTeamEvent("team_created");

    return { ok: true, data: { slug: result.slug, teamId: result.id } };
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      return {
        ok: false,
        code: "DUPLICATE_SLUG",
        message: "Slug is already in use. Try a different slug.",
      };
    }
    console.error("[teams] createTeamAction", err);
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Something went wrong. Try again.",
    };
  }
}

export async function updateTeamAction(input: {
  teamId: string;
  name: string;
  slug: string;
  nickname?: string | null;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}): Promise<TeamActionResult<{ slug: string }>> {
  const gate = await requireLinkedSteam();
  if (!gate.ok) return gate;

  const parsed = updateTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const existing = await getTeamById(parsed.data.teamId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Team not found." };
  }

  if (!isTeamLeader(existing.leaderSteamid64, gate.data.steamid64)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only the team leader can update settings.",
    };
  }

  const nextSlug = parsed.data.slug.trim().toLowerCase();
  if (nextSlug !== existing.slug.toLowerCase()) {
    if (await isTeamSlugTaken(nextSlug, existing.id)) {
      return {
        ok: false,
        code: "DUPLICATE_SLUG",
        message: "Slug is already in use. Try a different slug.",
      };
    }
  }

  const now = new Date().toISOString();

  try {
    await db
      .update(teams)
      .set({
        name: parsed.data.name,
        slug: nextSlug,
        nickname: parsed.data.nickname ?? null,
        description: parsed.data.description ?? null,
        primaryColor: parsed.data.primaryColor ?? null,
        secondaryColor: parsed.data.secondaryColor ?? null,
        updatedAt: now,
      })
      .where(eq(teams.id, existing.id));

    revalidatePath("/teams");
    revalidatePath(`/teams/${existing.slug}`);
    revalidatePath(`/teams/${nextSlug}`);
    await trackTeamEvent("team_updated");

    return { ok: true, data: { slug: nextSlug } };
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      return {
        ok: false,
        code: "DUPLICATE_SLUG",
        message: "Slug is already in use. Try a different slug.",
      };
    }
    console.error("[teams] updateTeamAction", err);
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Something went wrong. Try again.",
    };
  }
}

export async function setTeamAvatarAction(input: {
  teamId: string;
  objectPath: string | null;
}): Promise<TeamActionResult<{ objectPath: string | null }>> {
  const gate = await requireLinkedSteam();
  if (!gate.ok) return gate;

  const parsed = setTeamAvatarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const existing = await getTeamById(parsed.data.teamId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Team not found." };
  }

  if (!isTeamLeader(existing.leaderSteamid64, gate.data.steamid64)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only the team leader can update the team logo.",
    };
  }

  let storedPath: string | null = parsed.data.objectPath;
  if (storedPath) {
    const mediaPath = validateMediaObjectPath(storedPath);
    if (!mediaPath.ok) {
      return { ok: false, code: "VALIDATION", message: mediaPath.error };
    }
    const teamPath = assertTeamAvatarObjectPath(mediaPath.path, existing.id);
    if (!teamPath.ok) {
      return { ok: false, code: "VALIDATION", message: teamPath.error };
    }
    storedPath = teamPath.path;
  }

  const now = new Date().toISOString();

  try {
    await db
      .update(teams)
      .set({ avatar: storedPath, updatedAt: now })
      .where(eq(teams.id, existing.id));

    revalidatePath("/teams");
    revalidatePath(`/teams/${existing.slug}`);
    await trackTeamEvent("team_updated");

    return { ok: true, data: { objectPath: storedPath } };
  } catch (err) {
    console.error("[teams] setTeamAvatarAction", err);
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Something went wrong. Try again.",
    };
  }
}
