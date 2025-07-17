import { db } from "@/providers/postgres/drizzle/drizzle-client";
import { organisations } from "@/providers/postgres/drizzle/schema";
import type { Tables } from "@/types/supabase";
import { eq } from "drizzle-orm";

export type Organisation = Tables<"organisations">;

export async function getAllOrganisations(): Promise<Organisation[]> {
  const allOrgs = await db.select().from(organisations);
  return allOrgs.map((org) => ({
    ...org,
    metadata: org.metadata as any,
    settings: org.settings as any,
  }));
}

export async function getOrganisationById(
  id: string
): Promise<Organisation | null> {
  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, id))
    .limit(1);
  if (!org.length || !org[0]) return null;
  const o = org[0];
  return {
    id: o.id ?? "",
    created_at: o.created_at ?? null,
    description: o.description ?? null,
    is_active: o.is_active ?? null,
    logo_url: o.logo_url ?? null,
    metadata: o.metadata as any,
    name: o.name ?? "",
    settings: o.settings as any,
    slug: o.slug ?? "",
  };
}
