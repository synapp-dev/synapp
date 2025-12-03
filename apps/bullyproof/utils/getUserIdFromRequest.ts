import { verifySupabaseJWT } from "./verifySupabaseJWT";

export async function getUserIdFromRequest(
  request: Request
): Promise<string | null> {
  console.log("[getUserIdFromRequest] Starting user ID extraction");
  const authHeader = request.headers.get("authorization") || "";
  console.log(
    "[getUserIdFromRequest] Authorization header:",
    authHeader ? `Found (${authHeader.length} chars)` : "NOT FOUND"
  );

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  console.log(
    "[getUserIdFromRequest] Token extracted:",
    token ? `Found (${token.length} chars)` : "NOT FOUND"
  );

  if (!token) {
    console.warn("[getUserIdFromRequest] No token found - returning null");
    return null;
  }

  try {
    console.log("[getUserIdFromRequest] Verifying Supabase JWT...");
    const verified = await verifySupabaseJWT(token);
    const sub = verified.payload?.sub;
    console.log("[getUserIdFromRequest] JWT verified. Sub:", sub);
    const userId = (typeof sub === "string" && sub) || null;
    console.log("[getUserIdFromRequest] Returning userId:", userId || "null");
    return userId;
  } catch (error: any) {
    console.error("[getUserIdFromRequest] ERROR: Failed to verify JWT:", {
      error: error,
      message: error?.message,
      stack: error?.stack,
    });
    return null;
  }
}
