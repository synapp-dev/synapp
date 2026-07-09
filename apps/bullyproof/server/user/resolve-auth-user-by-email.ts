import type { SupabaseClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import { userProfile } from "@/server/db/schema";
import {
  isEmailExistsAuthError,
  normalizeLookupEmail,
} from "@/server/user/normalize-lookup-email";

type AdminAuthClient = SupabaseClient["auth"]["admin"];

/**
 * Resolves a user id by email via user_profile, then paginated auth.admin.listUsers.
 */
export async function findAuthUserIdByEmail(
  adminAuth: AdminAuthClient,
  email: string
): Promise<string | null> {
  const normalized = normalizeLookupEmail(email);

  const profileRows = await db
    .select({ id: userProfile.id })
    .from(userProfile)
    .where(sql`lower(${userProfile.email}) = ${normalized}`)
    .limit(1);

  if (profileRows.length > 0) {
    return profileRows[0].id;
  }

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData, error: listUsersError } = await adminAuth.listUsers({
      page,
      perPage: 1000,
    });

    if (listUsersError) {
      throw new Error(
        `Failed to check existing users: ${listUsersError.message}`
      );
    }

    const usersOnPage = pageData?.users ?? [];
    const match = usersOnPage.find(
      (u) => u.email?.toLowerCase() === normalized
    );
    if (match) {
      return match.id;
    }

    hasMore = usersOnPage.length >= 1000;
    page += 1;
  }

  return null;
}

/**
 * Returns existing auth user id or creates a new auth user. Never throws on email_exists.
 */
export async function getOrCreateAuthUserId(
  adminAuth: AdminAuthClient,
  email: string,
  options?: {
    emailConfirm?: boolean;
    userMetadata?: Record<string, unknown>;
  }
): Promise<string> {
  const existingId = await findAuthUserIdByEmail(adminAuth, email);
  if (existingId) {
    return existingId;
  }

  const { data: newUser, error: createError } = await adminAuth.createUser({
    email: email.trim(),
    email_confirm: options?.emailConfirm ?? true,
    user_metadata:
      options?.userMetadata && Object.keys(options.userMetadata).length > 0
        ? options.userMetadata
        : undefined,
  });

  if (createError) {
    if (isEmailExistsAuthError(createError)) {
      const resolvedId = await findAuthUserIdByEmail(adminAuth, email);
      if (resolvedId) {
        return resolvedId;
      }
    }
    throw new Error(`Failed to create user: ${createError.message}`);
  }

  if (!newUser.user) {
    throw new Error("Failed to create user: No user returned");
  }

  return newUser.user.id;
}

export async function getProfileByEmail(email: string) {
  const normalized = normalizeLookupEmail(email);
  const rows = await db
    .select()
    .from(userProfile)
    .where(sql`lower(${userProfile.email}) = ${normalized}`)
    .limit(1);
  return rows[0] ?? null;
}
