export type SupabaseJwtClaims = {
  iss?: string;
  sub?: string;
  aud?: string[] | string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  role?: string;
  email?: string;
};

export function supabaseClaimsFromJwtPayload(
  payload: Record<string, unknown>,
): SupabaseJwtClaims {
  const role =
    typeof payload.role === "string" ? payload.role : "authenticated";
  return {
    ...payload,
    sub: typeof payload.sub === "string" ? payload.sub : undefined,
    role,
  };
}
