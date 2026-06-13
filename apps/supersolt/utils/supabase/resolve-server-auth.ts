import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createAppDb,
  supabaseClaimsFromJwtPayload,
  type AppDb,
} from "@/server/db/create-app-db";
import { readAccessTokenFromAuthCookie } from "@/utils/supabase/read-auth-access-token";
import { verifySupabaseJWT } from "@/utils/verifySupabaseJWT";

export type VerifiedServerAuth = {
  userId: string;
  appDb: AppDb;
};

/**
 * Cookie-session auth for Server Components and API routes:
 * `getUser()` validates with Supabase Auth; access token comes from cookies + JWKS.
 */
export async function resolveVerifiedServerAuthFromCookies(
  supabase: SupabaseClient,
): Promise<VerifiedServerAuth | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return null;
  }

  const accessToken = await readAccessTokenFromAuthCookie();
  if (!accessToken) {
    return null;
  }

  try {
    const verified = await verifySupabaseJWT(accessToken);
    const sub =
      typeof verified.payload.sub === "string" ? verified.payload.sub : null;
    if (sub !== user.id) {
      return null;
    }
    const appDb = createAppDb(
      supabaseClaimsFromJwtPayload(
        verified.payload as Record<string, unknown>,
      ),
    );
    return { userId: user.id, appDb };
  } catch {
    return null;
  }
}
