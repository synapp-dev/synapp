import { createRemoteJWKSet, jwtVerify, JWTVerifyResult } from "jose";

const SUPABASE_JWT_KEYS = createRemoteJWKSet(
  new URL(process.env.NEXT_PUBLIC_SUPABASE_JWKS_URL!)
);

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
