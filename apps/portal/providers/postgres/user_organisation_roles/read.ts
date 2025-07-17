import { db } from "@/providers/postgres/drizzle/drizzle-client";
import { user_organisation_roles } from "@/providers/postgres/drizzle/schema";
import { organisation_roles } from "@/providers/postgres/drizzle/schema";
import { organisations } from "@/providers/postgres/drizzle/schema";
import type { Tables } from "@/types/supabase";
import { eq } from "drizzle-orm";

export type UserOrganisationRole = Tables<"user_organisation_roles">;

export async function getAllUserOrganisationRoles(): Promise<
  (UserOrganisationRole & {
    role_name: string;
    organisation: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
    };
  })[]
> {
  const allRoles = await db
    .select({
      id: user_organisation_roles.id,
      assigned_at: user_organisation_roles.assigned_at,
      expires_at: user_organisation_roles.expires_at,
      metadata: user_organisation_roles.metadata,
      notes: user_organisation_roles.notes,
      organisation_id: user_organisation_roles.organisation_id,
      role_id: user_organisation_roles.role_id,
      user_id: user_organisation_roles.user_id,
      role_name: organisation_roles.name,
      organisation: {
        id: organisations.id,
        name: organisations.name,
        slug: organisations.slug,
        description: organisations.description,
      },
    })
    .from(user_organisation_roles)
    .leftJoin(
      organisation_roles,
      eq(user_organisation_roles.role_id, organisation_roles.id)
    )
    .leftJoin(
      organisations,
      eq(user_organisation_roles.organisation_id, organisations.id)
    );
  return allRoles.map((row) => ({
    ...row,
    organisation_id: row.organisation_id ?? "",
    role_id: row.role_id ?? "",
    user_id: row.user_id ?? "",
    metadata: row.metadata as any,
    role_name: row.role_name ?? "",
    organisation: {
      id: row.organisation?.id ?? "",
      name: row.organisation?.name ?? "",
      slug: row.organisation?.slug ?? "",
      description: row.organisation?.description ?? null,
    },
  }));
}
