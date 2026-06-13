import { createRemoteJWKSet, jwtVerify, type JWTVerifyResult } from "jose";

const jwksUrlFromEnv = process.env.NEXT_PUBLIC_SUPABASE_JWKS_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const resolvedJwksUrl =
  jwksUrlFromEnv ||
  (supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`
    : undefined);

if (!resolvedJwksUrl) {
  throw new Error(
    "Missing JWKS URL: set NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_JWKS_URL",
  );
}

const SUPABASE_JWT_KEYS = createRemoteJWKSet(new URL(resolvedJwksUrl));

export async function verifySupabaseJWT(
  token: string,
): Promise<JWTVerifyResult> {
  return jwtVerify(token, SUPABASE_JWT_KEYS);
}
