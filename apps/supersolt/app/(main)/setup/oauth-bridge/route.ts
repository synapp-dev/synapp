import { NextResponse, type NextRequest } from "next/server";

import {
  buildFallbackSetupPath,
  buildOAuthPopupBridgeHtml,
  oauthPopupMessageFromUrl,
} from "@/lib/oauth/oauth-popup-bridge";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const message = oauthPopupMessageFromUrl(url);

  if (!message) {
    return NextResponse.redirect(new URL("/setup", url.origin), 302);
  }

  const fallbackPath = buildFallbackSetupPath(url.searchParams);
  const html = buildOAuthPopupBridgeHtml(message, url.origin, fallbackPath);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
