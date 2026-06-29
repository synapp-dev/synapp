import "server-only";

import { SignJWT, jwtVerify } from "jose";

import { AC_PAIRING_TOKEN_TTL_S } from "@/lib/ac/constants";

/**
 * Deep-link pairing tokens. When a logged-in player clicks "Launch AC", the web app
 * mints a short-lived signed token and hands it to the desktop client via the
 * `intradark-ac://pair?token=…` deep link. The client exchanges it at /api/ac/pair
 * for a long-lived device token. See docs/anticheat-client-build-decisions.md §Q4.
 *
 * Symmetric HMAC (HS256) signed with AC_PAIRING_SECRET — fail closed if unset.
 */

const ISSUER = "intradark";
const AUDIENCE = "intradark-ac";

function secretKey(): Uint8Array {
  const secret = process.env.AC_PAIRING_SECRET;
  if (!secret) {
    // Fail closed — never mint/verify pairing tokens without a configured secret.
    throw new Error("AC_PAIRING_SECRET not configured");
  }
  return new TextEncoder().encode(secret);
}

export type PairingClaims = {
  /** auth.users(id) */
  userId: string;
  /** SteamID64 if linked at mint time; null otherwise (resolved server-side later). */
  steamid64: string | null;
};

/** Mint a pairing token for a logged-in user (short TTL). */
export async function mintPairingToken(claims: PairingClaims): Promise<string> {
  return new SignJWT({ steamid64: claims.steamid64 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${AC_PAIRING_TOKEN_TTL_S}s`)
    .sign(secretKey());
}

/** Verify a pairing token and return its claims, or throw if invalid/expired. */
export async function verifyPairingToken(token: string): Promise<PairingClaims> {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (!payload.sub) throw new Error("Pairing token missing subject");
  const steamid64 = payload.steamid64;
  return {
    userId: payload.sub,
    steamid64: typeof steamid64 === "string" ? steamid64 : null,
  };
}
