import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSquareOAuthStateSecret } from "@/server/square/config";

export const SQUARE_OAUTH_COOKIE = "ss_square_oauth";

const TTL_SECONDS = 600;

export type SquareOAuthContext = {
  nonce: string;
  venueId: string;
  organisationId: string;
  userId: string;
  orgSlug: string;
  venueSlug: string;
  next: string | null;
  exp: number;
};

function signPayload(b64: string, secret: string): string {
  return createHmac("sha256", secret).update(b64).digest("base64url");
}

/** Short `state` on Square’s URL; venue binding in this signed cookie (Square only returns code + state). */
type CookieWire = {
  n: string;
  vi: string;
  oi: string;
  ui: string;
  os: string;
  vs: string;
  x: string | null;
  e: number;
};

function wireToContext(w: CookieWire): SquareOAuthContext {
  return {
    nonce: w.n,
    venueId: w.vi,
    organisationId: w.oi,
    userId: w.ui,
    orgSlug: w.os,
    venueSlug: w.vs,
    next: w.x,
    exp: w.e,
  };
}

export function createSquareOAuthCookiePair(args: {
  venueId: string;
  organisationId: string;
  userId: string;
  orgSlug: string;
  venueSlug: string;
  next: string | null;
}): { cookieValue: string; stateParam: string } {
  const secret = getSquareOAuthStateSecret();
  if (!secret) {
    throw new Error(
      "Square OAuth state signing requires SQUARE_OAUTH_STATE_SECRET or SQUARE_APPLICATION_SECRET"
    );
  }

  const nonce = randomBytes(18).toString("hex");
  const wire: CookieWire = {
    n: nonce,
    vi: args.venueId,
    oi: args.organisationId,
    ui: args.userId,
    os: args.orgSlug,
    vs: args.venueSlug,
    x: args.next,
    e: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };

  const b64 = Buffer.from(JSON.stringify(wire), "utf8").toString("base64url");
  const sig = signPayload(b64, secret);
  return { cookieValue: `${b64}.${sig}`, stateParam: nonce };
}

export function verifySquareOAuthCookie(
  cookieValue: string | null | undefined,
  stateFromUrl: string
): { ok: true; payload: SquareOAuthContext } | { ok: false; reason: string } {
  const secret = getSquareOAuthStateSecret();
  if (!secret) {
    return { ok: false, reason: "missing_secret" };
  }

  if (!cookieValue || !stateFromUrl) {
    return { ok: false, reason: "missing_cookie_or_state" };
  }

  const parts = cookieValue.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "invalid_cookie_format" };
  }

  const [b64, sig] = parts;
  const expected = signPayload(b64, secret);
  const sigBuf = Buffer.from(sig, "base64url");
  const expBuf = Buffer.from(expected, "base64url");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, reason: "bad_signature" };
  }

  let wire: CookieWire;
  try {
    wire = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as CookieWire;
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  if (wire.n !== stateFromUrl) {
    return { ok: false, reason: "nonce_mismatch" };
  }

  if (wire.e < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload: wireToContext(wire) };
}

export function attachSquareOAuthCookie(
  response: NextResponse,
  request: NextRequest,
  cookieValue: string
): void {
  response.cookies.set(SQUARE_OAUTH_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
    secure: request.nextUrl.protocol === "https:",
  });
}

export function clearSquareOAuthCookie(response: NextResponse, request: NextRequest): void {
  response.cookies.set(SQUARE_OAUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: request.nextUrl.protocol === "https:",
  });
}
