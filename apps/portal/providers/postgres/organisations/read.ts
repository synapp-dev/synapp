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

export async function getOrganisationBySlug(
  slug: string
): Promise<Organisation | null> {
  const org = await db
    .select()
    .from(organisations)
    .where(eq(organisations.slug, slug))
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

export async function getOrganisationByIdOrSlug(
  identifier: string
): Promise<Organisation | null> {
  // Check if identifier matches UUID format (more reliable than try/catch)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  
  if (isUUID) {
    // If it looks like a UUID, query by ID
    return await getOrganisationById(identifier);
  } else {
    // Otherwise, assume it's a slug
    return await getOrganisationBySlug(identifier);
  }
}

// API client function for HTTP requests (when you need to call from client-side or external services)
export async function fetchOrganisationByIdOrSlug(idOrSlug: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/organisations/${idOrSlug}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch organisation: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.success ? result.data : null;
}
