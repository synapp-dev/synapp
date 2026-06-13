import { and, eq, isNull, sql } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { organisationMemberInvites } from "@/server/db/schema";

export const organisationMemberInvitesRepo = {
  async listForOrganisation(tx: RlsTx, organisationId: string) {
    return tx
      .select()
      .from(organisationMemberInvites)
      .where(eq(organisationMemberInvites.organisationId, organisationId))
      .orderBy(organisationMemberInvites.createdAt);
  },

  async listPendingForOrganisation(tx: RlsTx, organisationId: string) {
    return tx
      .select()
      .from(organisationMemberInvites)
      .where(
        and(
          eq(organisationMemberInvites.organisationId, organisationId),
          isNull(organisationMemberInvites.acceptedAt),
          isNull(organisationMemberInvites.revokedAt),
        ),
      )
      .orderBy(organisationMemberInvites.createdAt);
  },

  async getById(tx: RlsTx, inviteId: string) {
    const rows = await tx
      .select()
      .from(organisationMemberInvites)
      .where(eq(organisationMemberInvites.id, inviteId))
      .limit(1);
    return rows[0] ?? null;
  },

  async findPendingByEmail(
    tx: RlsTx,
    args: { organisationId: string; email: string },
  ) {
    const rows = await tx
      .select()
      .from(organisationMemberInvites)
      .where(
        and(
          eq(organisationMemberInvites.organisationId, args.organisationId),
          sql`lower(trim(${organisationMemberInvites.email})) = ${args.email}`,
          isNull(organisationMemberInvites.acceptedAt),
          isNull(organisationMemberInvites.revokedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async listPendingByEmail(tx: RlsTx, email: string) {
    return tx
      .select()
      .from(organisationMemberInvites)
      .where(
        and(
          sql`lower(trim(${organisationMemberInvites.email})) = ${email}`,
          isNull(organisationMemberInvites.acceptedAt),
          isNull(organisationMemberInvites.revokedAt),
        ),
      );
  },

  async insert(tx: RlsTx, row: typeof organisationMemberInvites.$inferInsert) {
    const inserted = await tx
      .insert(organisationMemberInvites)
      .values(row)
      .returning({ id: organisationMemberInvites.id });
    return inserted[0]?.id ?? null;
  },

  async markAccepted(
    tx: RlsTx,
    args: { inviteId: string; organisationId: string; acceptedAt: string },
  ) {
    await tx
      .update(organisationMemberInvites)
      .set({
        acceptedAt: args.acceptedAt,
        updatedAt: args.acceptedAt,
      })
      .where(
        and(
          eq(organisationMemberInvites.id, args.inviteId),
          eq(organisationMemberInvites.organisationId, args.organisationId),
        ),
      );
  },

  async markRevoked(
    tx: RlsTx,
    args: { inviteId: string; organisationId: string; revokedAt: string },
  ) {
    await tx
      .update(organisationMemberInvites)
      .set({
        revokedAt: args.revokedAt,
        updatedAt: args.revokedAt,
      })
      .where(
        and(
          eq(organisationMemberInvites.id, args.inviteId),
          eq(organisationMemberInvites.organisationId, args.organisationId),
        ),
      );
  },

  async updateExpiry(
    tx: RlsTx,
    args: {
      inviteId: string;
      organisationId: string;
      expiresAt: string;
      updatedAt: string;
    },
  ) {
    await tx
      .update(organisationMemberInvites)
      .set({
        expiresAt: args.expiresAt,
        updatedAt: args.updatedAt,
      })
      .where(
        and(
          eq(organisationMemberInvites.id, args.inviteId),
          eq(organisationMemberInvites.organisationId, args.organisationId),
        ),
      );
  },
};
