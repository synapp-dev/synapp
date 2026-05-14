import { eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { userProfiles } from "@/server/db/schema";
import { createServerClient } from "@/utils/supabase/server";

export type UtilityLineupUploadEligibilityCode =
  | "NOT_SIGNED_IN"
  | "NO_PROFILE"
  | "EMAIL_NOT_VERIFIED"
  | "STEAM_NOT_LINKED"
  | "DISCORD_NOT_LINKED";

export type UtilityLineupUploadEligibility =
  | { ok: true; userId: string; profileId: string }
  | {
      ok: false;
      code: UtilityLineupUploadEligibilityCode;
      message: string;
    };

const eligibilityMessages: Record<UtilityLineupUploadEligibilityCode, string> = {
  NOT_SIGNED_IN: "Sign in to upload lineups.",
  NO_PROFILE: "Complete your profile before uploading lineups.",
  EMAIL_NOT_VERIFIED: "Verify your email to upload lineups.",
  STEAM_NOT_LINKED: "Link your Steam account to upload lineups.",
  DISCORD_NOT_LINKED: "Link your Discord account to upload lineups.",
};

/** Pure gate for profile + email verification (session handled separately). */
export function utilityLineupUploadEligibilityIssue(args: {
  emailConfirmedAt: string | null | undefined;
  steamProfileId: number | null | undefined;
  discordUserId: string | null | undefined;
  hasProfileRow: boolean;
}): UtilityLineupUploadEligibilityCode | null {
  if (!args.hasProfileRow) return "NO_PROFILE";
  if (!args.emailConfirmedAt) return "EMAIL_NOT_VERIFIED";
  if (args.steamProfileId == null) return "STEAM_NOT_LINKED";
  if (!(args.discordUserId?.trim())) return "DISCORD_NOT_LINKED";
  return null;
}

export async function resolveUtilityLineupUploadEligibility(): Promise<UtilityLineupUploadEligibility> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      ok: false,
      code: "NOT_SIGNED_IN",
      message: eligibilityMessages.NOT_SIGNED_IN,
    };
  }

  const rows = await db
    .select({
      id: userProfiles.id,
      steamProfileId: userProfiles.steamProfileId,
      discordUserId: userProfiles.discordUserId,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);

  const profile = rows[0];
  const issue = utilityLineupUploadEligibilityIssue({
    emailConfirmedAt: user.email_confirmed_at,
    steamProfileId: profile?.steamProfileId ?? null,
    discordUserId: profile?.discordUserId ?? null,
    hasProfileRow: Boolean(profile),
  });
  if (issue) {
    return { ok: false, code: issue, message: eligibilityMessages[issue] };
  }

  return { ok: true, userId: user.id, profileId: profile!.id };
}

/** Serializable gate for server components (e.g. map page + upload button). */
export async function getUtilityLineupUploadGateForPage(): Promise<{
  canUpload: boolean;
  message: string | null;
}> {
  const r = await resolveUtilityLineupUploadEligibility();
  if (r.ok) return { canUpload: true, message: null };
  return { canUpload: false, message: r.message };
}
