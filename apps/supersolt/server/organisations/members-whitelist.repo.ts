import { and, eq, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import { authWhitelist } from "@/server/db/schema";

export const membersWhitelistRepo = {
  async findActiveByEmailOrg(
    appDb: Pick<AppDb, "admin">,
    args: { email: string; organisationId: string },
  ) {
    const rows = await appDb.admin
      .select()
      .from(authWhitelist)
      .where(
        and(
          eq(authWhitelist.organisationId, args.organisationId),
          eq(authWhitelist.status, "active"),
          sql`lower(trim(${authWhitelist.email})) = ${args.email}`,
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async listActiveByEmail(appDb: Pick<AppDb, "admin">, email: string) {
    return appDb.admin
      .select()
      .from(authWhitelist)
      .where(
        and(
          eq(authWhitelist.status, "active"),
          sql`lower(trim(${authWhitelist.email})) = ${email}`,
        ),
      );
  },

  async upsertActive(
    tx: RlsTx,
    args: {
      email: string;
      organisationId: string;
      addedBy: string | null;
      now: string;
      trialExpiresAt?: string | null;
    },
  ) {
    const existing = await tx
      .select({ id: authWhitelist.id })
      .from(authWhitelist)
      .where(
        and(
          eq(authWhitelist.organisationId, args.organisationId),
          eq(authWhitelist.status, "active"),
          sql`lower(trim(${authWhitelist.email})) = ${args.email}`,
        ),
      )
      .limit(1);

    if (existing[0]) {
      await tx
        .update(authWhitelist)
        .set({
          revokedAt: null,
          updatedAt: args.now,
          ...(args.trialExpiresAt !== undefined
            ? { trialExpiresAt: args.trialExpiresAt }
            : {}),
        })
        .where(eq(authWhitelist.id, existing[0].id));
      return existing[0].id;
    }

    const inserted = await tx
      .insert(authWhitelist)
      .values({
        email: args.email,
        organisationId: args.organisationId,
        status: "active",
        addedBy: args.addedBy,
        addedAt: args.now,
        updatedAt: args.now,
        trialExpiresAt: args.trialExpiresAt ?? null,
      })
      .returning({ id: authWhitelist.id });
    return inserted[0]?.id ?? null;
  },

  async revokeActive(
    tx: RlsTx,
    args: { email: string; organisationId: string; now: string },
  ) {
    await tx
      .update(authWhitelist)
      .set({
        status: "revoked",
        revokedAt: args.now,
        updatedAt: args.now,
      })
      .where(
        and(
          eq(authWhitelist.organisationId, args.organisationId),
          eq(authWhitelist.status, "active"),
          sql`lower(trim(${authWhitelist.email})) = ${args.email}`,
        ),
      );
  },
};
