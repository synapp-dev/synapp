import { and, eq } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import { organisations, venues } from "@/server/db/schema";
import { slugifyBase } from "@/server/onboarding/slug";

export async function ensureUniqueOrganisationSlug(
  appDb: AppDb,
  name: string,
): Promise<string> {
  const base = slugifyBase(name);
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await appDb.admin
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.slug, candidate))
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }
  }

  throw new Error("Could not allocate a unique organisation slug");
}

export async function ensureUniqueVenueSlug(
  appDb: AppDb,
  organisationId: string,
  name: string,
): Promise<string> {
  const base = slugifyBase(name);
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await appDb.rls((tx) =>
      tx
        .select({ id: venues.id })
        .from(venues)
        .where(
          and(
            eq(venues.organisationId, organisationId),
            eq(venues.slug, candidate),
          ),
        )
        .limit(1),
    );

    if (existing.length === 0) {
      return candidate;
    }
  }

  throw new Error("Could not allocate a unique venue slug");
}
