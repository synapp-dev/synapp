import { NextResponse } from "next/server";

import { buildRequestAuthContext } from "@/server/auth/context";
import type { RequestAuthContext } from "@/server/auth/context";
import { resolveRequestAuth } from "@/server/db/request-auth";

export async function requireRequestAuth(
  request: Request,
): Promise<
  | { ctx: RequestAuthContext; errorResponse: null }
  | { ctx: null; errorResponse: NextResponse }
> {
  const auth = await resolveRequestAuth(request);
  if (!auth) {
    return {
      ctx: null,
      errorResponse: NextResponse.json(
        { data: null, error: { message: "Unauthorized", status: 401 } },
        { status: 401 },
      ),
    };
  }

  const ctx = await buildRequestAuthContext(auth.userId, auth.appDb);
  return { ctx, errorResponse: null };
}
