"use server";

import { z } from "zod";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasAnyAdminSlug } from "@/entities/admin/lib/role-slugs";
import { ADMIN_AREA_SLUGS } from "@/entities/admin/lib/rbac-constants";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

import {
  countBroadcastRecipients,
  enqueueAdminBroadcast,
  enqueueDirectMessage,
} from "./lib/server/steam-dm";

type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Sign in required." };
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasAnyAdminSlug(slugs, ADMIN_AREA_SLUGS)) {
    return { ok: false, error: "Admin role required." };
  }
  return { ok: true };
}

const broadcastSchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty.").max(900),
  link: z.string().trim().url().or(z.literal("")).optional(),
  testOnly: z.boolean().optional(),
});

export async function sendAdminBroadcastAction(input: {
  body: string;
  link?: string;
  testOnly?: boolean;
}): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { body, link, testOnly } = parsed.data;

  let testSteamid64: string | null = null;
  if (testOnly) {
    const me = await getCurrentUserProfiles();
    testSteamid64 = me?.userProfile.steam_profile_id ?? null;
    if (!testSteamid64) {
      return { ok: false, error: "Link your Steam account to send a test." };
    }
  }

  await enqueueAdminBroadcast({ body, link: link || null, testSteamid64 });

  return {
    ok: true,
    message: testOnly
      ? "Test sent to your Steam account (if you've added the bot)."
      : "Broadcast queued — the bot is sending it now.",
  };
}

export async function getBroadcastRecipientCountAction(): Promise<number> {
  const gate = await requireAdmin();
  if (!gate.ok) return 0;
  return countBroadcastRecipients();
}

const directMessageSchema = z.object({
  steamid64: z.string().regex(/^\d{17}$/, "Invalid Steam ID."),
  body: z.string().trim().min(1, "Message can't be empty.").max(900),
});

export async function sendDirectMessageAction(input: {
  steamid64: string;
  body: string;
}): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const parsed = directMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await enqueueDirectMessage(parsed.data.steamid64, parsed.data.body);
  return { ok: true, message: "Message queued — the bot is sending it." };
}
