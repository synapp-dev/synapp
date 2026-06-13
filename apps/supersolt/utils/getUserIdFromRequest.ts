import { verifySupabaseJWT } from "./verifySupabaseJWT";

export async function getUserIdFromRequest(
  request: Request,
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
    return typeof sub === "string" && sub ? sub : null;
  } catch {
    return null;
  }
}

export function getBearerTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
