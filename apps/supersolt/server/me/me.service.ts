import type { MeUser } from "@/entities/me/model/store";
import type { RequestAuthContext } from "@/server/auth/context";
import { userProfilesRepo } from "@/server/me/user-profiles.repo";

type AuthUserMetadata = {
  full_name?: unknown;
  name?: unknown;
  avatar_url?: unknown;
};

export async function getMeUser(
  ctx: RequestAuthContext,
  args: {
    email: string | null;
    emailConfirmed: boolean;
    userMetadata?: AuthUserMetadata | null;
    appRole: string | null;
  },
): Promise<MeUser | { code: "email_not_confirmed" }> {
  if (!args.emailConfirmed) {
    return { code: "email_not_confirmed" };
  }

  const profile = await ctx.appDb.rls((tx) =>
    userProfilesRepo.getActiveProfile(tx, ctx.userId),
  );

  const firstName = profile?.firstName ?? null;
  const lastName = profile?.lastName ?? null;
  const profileFullName = profile?.fullName ?? null;
  const computedFullName =
    [firstName, lastName].filter((part) => Boolean(part)).join(" ").trim() ||
    profileFullName ||
    null;

  const setupCompletedAt = profile?.setupCompletedAt ?? null;
  const metadata = args.userMetadata ?? null;

  return {
    id: ctx.userId,
    email: profile?.email ?? args.email,
    firstName,
    lastName,
    fullName:
      computedFullName ??
      (typeof metadata?.full_name === "string" ? metadata.full_name : null) ??
      (typeof metadata?.name === "string" ? metadata.name : null),
    avatarUrl:
      profile?.avatarUrl ??
      (typeof metadata?.avatar_url === "string" ? metadata.avatar_url : null),
    role: args.appRole,
    features: [],
    needsSetup: !setupCompletedAt,
    setupCompletedAt,
  };
}
