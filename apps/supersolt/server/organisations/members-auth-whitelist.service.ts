import type { AppDb } from "@/server/db/create-app-db";
import { membersWhitelistRepo } from "@/server/organisations/members-whitelist.repo";
import { normalizeInviteEmail } from "@/server/organisations/members-policy";

type WhitelistDb = Pick<AppDb, "admin">;

export async function isEmailWhitelistedForOrganisation(
  appDb: WhitelistDb,
  args: { email: string; organisationId: string },
): Promise<boolean> {
  const email = normalizeInviteEmail(args.email);
  const row = await membersWhitelistRepo.findActiveByEmailOrg(appDb, {
    email,
    organisationId: args.organisationId,
  });
  if (!row) {
    return false;
  }
  if (row.trialExpiresAt) {
    const expires = new Date(row.trialExpiresAt).getTime();
    if (!Number.isNaN(expires) && expires <= Date.now()) {
      return false;
    }
  }
  return true;
}

export async function listWhitelistedOrganisationsForEmail(
  appDb: WhitelistDb,
  email: string,
): Promise<
  Array<{
    organisationId: string;
    trialExpiresAt: string | null;
  }>
> {
  const normalized = normalizeInviteEmail(email);
  const rows = await membersWhitelistRepo.listActiveByEmail(appDb, normalized);
  return rows.map((r) => ({
    organisationId: r.organisationId,
    trialExpiresAt: r.trialExpiresAt,
  }));
}
