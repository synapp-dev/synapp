import { createRemoteJWKSet, jwtVerify, JWTVerifyResult } from "jose";

const jwksUrlFromEnv = process.env.NEXT_PUBLIC_SUPABASE_JWKS_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const resolvedJwksUrl =
  jwksUrlFromEnv ||
  (supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`
    : undefined);

if (!resolvedJwksUrl) {
  throw new Error(
    "Missing JWKS URL: set NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_JWKS_URL"
  );
}

const SUPABASE_JWT_KEYS = createRemoteJWKSet(new URL(resolvedJwksUrl));

/**
 * Verifies a Supabase JWT token using the remote JWKS.
 * Throws an error if verification fails.
 * @param token The JWT token string (without 'Bearer ' prefix)
 * @returns The JWTVerifyResult if successful
 */
export async function verifySupabaseJWT(
  token: string
): Promise<JWTVerifyResult> {
  return jwtVerify(token, SUPABASE_JWT_KEYS);
}
