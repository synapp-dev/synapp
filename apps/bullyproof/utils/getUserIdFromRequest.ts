import { verifySupabaseJWT } from "./verifySupabaseJWT";

export async function getUserIdFromRequest(
  request: Request
): Promise<string | null> {
  const authHeader = request.headers.get("authorization") || "";

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token) {
    return null;
  }

  try {
    const verified = await verifySupabaseJWT(token);
    const sub = verified.payload?.sub;
    const userId = (typeof sub === "string" && sub) || null;
    return userId;
  } catch {
    return null;
  }
}
