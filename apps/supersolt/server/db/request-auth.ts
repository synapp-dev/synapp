import { createServerClient } from "@/utils/supabase/server";
import {
  getBearerTokenFromRequest,
  getUserIdFromRequest,
} from "@/utils/getUserIdFromRequest";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import { verifySupabaseJWT } from "@/utils/verifySupabaseJWT";

import {
  createAppDb,
  supabaseClaimsFromJwtPayload,
  type AppDb,
} from "@/server/db/create-app-db";

export type RequestAuth = {
  userId: string;
  appDb: AppDb;
};

async function appDbFromAccessToken(accessToken: string): Promise<AppDb | null> {
  try {
    const verified = await verifySupabaseJWT(accessToken);
    const claims = supabaseClaimsFromJwtPayload(
      verified.payload as Record<string, unknown>,
    );
    if (!claims.sub) {
      return null;
    }
    return createAppDb(claims);
  } catch {
    return null;
  }
}

/**
 * Resolves user id + RLS-scoped Drizzle client from Bearer token or session cookies.
 */
export async function resolveRequestAuth(
  request: Request,
): Promise<RequestAuth | null> {
  const bearer = getBearerTokenFromRequest(request);
  if (bearer) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return null;
    }
    const appDb = await appDbFromAccessToken(bearer);
    if (!appDb) {
      return null;
    }
    return { userId, appDb };
  }

  const supabase = await createServerClient();
  const verified = await resolveVerifiedServerAuthFromCookies(supabase);
  if (!verified) {
    return null;
  }

  return { userId: verified.userId, appDb: verified.appDb };
}
