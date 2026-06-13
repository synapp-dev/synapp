import { and, eq, isNull } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { organisations, venues } from "@/server/db/schema";

export type VenueScope = {
  organisationId: string;
  venueId: string;
  timezone: string;
  organisationName: string;
  venueName: string;
};

export const scopeRepo = {
  async getVenueContextBySlugs(
    tx: RlsTx,
    organisationSlug: string,
    venueSlug: string,
  ): Promise<VenueScope | null> {
    const rows = await tx
      .select({
        venueId: venues.id,
        venueName: venues.name,
        organisationId: venues.organisationId,
        timezone: venues.timezone,
        organisationName: organisations.name,
        organisationSlug: organisations.slug,
      })
      .from(venues)
      .innerJoin(organisations, eq(organisations.id, venues.organisationId))
      .where(
        and(
          eq(venues.slug, venueSlug),
          eq(venues.isActive, true),
          isNull(venues.archivedAt),
          eq(organisations.slug, organisationSlug),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      organisationId: row.organisationId,
      venueId: row.venueId,
      timezone: row.timezone,
      organisationName: row.organisationName,
      venueName: row.venueName,
    };
  },

  async getOrganisationIdBySlug(
    tx: RlsTx,
    organisationSlug: string,
  ): Promise<string | null> {
    const rows = await tx
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.slug, organisationSlug))
      .limit(1);
    return rows[0]?.id ?? null;
  },
};
