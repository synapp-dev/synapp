import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

function redirectPreservingSessionCookies(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie.name, cookie.value);
  }
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { response: sessionResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (pathname === "/") {
    if (user) {
      return redirectPreservingSessionCookies(
        request,
        sessionResponse,
        "/dashboard",
      );
    }
    return redirectPreservingSessionCookies(request, sessionResponse, "/auth");
  }

  if (pathname === "/auth" && user) {
    return redirectPreservingSessionCookies(
      request,
      sessionResponse,
      "/dashboard",
    );
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (image file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
