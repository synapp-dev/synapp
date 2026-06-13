import { createServerClient } from "@/utils/supabase/server";
import { resolveVerifiedServerAuthFromCookies } from "@/utils/supabase/resolve-server-auth";
import {
  buildRequestAuthContext,
  type RequestAuthContext,
} from "@/server/auth/context";

/**
 * Resolves RequestAuthContext from the current cookie session (Server Components / RSC).
 */
export async function getServerRequestAuthContext(): Promise<RequestAuthContext | null> {
  const supabase = await createServerClient();
  const verified = await resolveVerifiedServerAuthFromCookies(supabase);
  if (!verified) {
    return null;
  }

  return buildRequestAuthContext(verified.userId, verified.appDb);
}
