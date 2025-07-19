import { db } from "@/providers/postgres/drizzle/drizzle-client";
import { user_organisation_roles, organisations } from "@/providers/postgres/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Check if a user has access to a specific organisation
 * @param userId - The user ID to check
 * @param organisationIdentifier - The organisation ID or slug to check access for
 * @param isSlug - If true, treats organisationIdentifier as slug; if false (default), treats as ID
 * @returns Promise<boolean> - True if user has access, false otherwise
 */
export async function CheckOrgAccess(
  userId: string, 
  organisationIdentifier: string, 
  isSlug: boolean = false
): Promise<boolean> {
  try {
    // TODO: Implement actual organization access logic
    // For now, return a placeholder that logs the parameters
    console.log(`Checking organization access for user: ${userId}, organisation: ${organisationIdentifier}, by ${isSlug ? 'slug' : 'id'}`);
    
    // Build the where condition based on whether we're checking by slug or ID
    const orgCondition = isSlug
      ? eq(organisations.slug, organisationIdentifier)
      : eq(organisations.id, organisationIdentifier);
    
    // Check if the user has any role in the organisation
    const userOrgRole = await db
      .select()
      .from(user_organisation_roles)
      .leftJoin(organisations, eq(user_organisation_roles.organisation_id, organisations.id))
      .where(
        and(
          eq(user_organisation_roles.user_id, userId),
          orgCondition
        )
      )
      .limit(1);

    // Return true if user has any role in the organisation, false otherwise
    return userOrgRole.length > 0;
  } catch (error) {
    console.error('Error checking organization access:', error);
    return false;
  }
} 