import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getXeroOAuthStateSecret } from "@/server/xero/config";

export const XERO_OAUTH_COOKIE = "ss_xero_oauth";

const TTL_SECONDS = 600;

export type XeroOAuthContext = {
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

function wireToContext(w: CookieWire): XeroOAuthContext {
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

export function createXeroOAuthCookiePair(args: {
  venueId: string;
  organisationId: string;
  userId: string;
  orgSlug: string;
  venueSlug: string;
  next: string | null;
}): { cookieValue: string; stateParam: string } {
  const secret = getXeroOAuthStateSecret();
  if (!secret) {
    throw new Error(
      "Xero OAuth state signing requires XERO_OAUTH_STATE_SECRET or XERO_CLIENT_SECRET",
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

export function verifyXeroOAuthCookie(
  cookieValue: string | null | undefined,
  stateFromUrl: string,
): { ok: true; payload: XeroOAuthContext } | { ok: false; reason: string } {
  const secret = getXeroOAuthStateSecret();
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

export function attachXeroOAuthCookie(
  response: NextResponse,
  request: NextRequest,
  cookieValue: string,
): void {
  response.cookies.set(XERO_OAUTH_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
    secure: request.nextUrl.protocol === "https:",
  });
}

export function clearXeroOAuthCookie(response: NextResponse, request: NextRequest): void {
  response.cookies.set(XERO_OAUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: request.nextUrl.protocol === "https:",
  });
}
