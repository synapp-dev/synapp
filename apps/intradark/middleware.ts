import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /@username redirect (already present)
  if (pathname.startsWith("/@") && pathname.length > 2) {
    const username = pathname.substring(2);
    const newUrl = new URL(`/api/steam/resolve/${username}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  // /id/* redirect
  if (pathname.startsWith("/id/") && pathname.length > 4) {
    const id = pathname.substring(4); // everything after /id/
    if (id) {
      const newUrl = new URL(`/api/steam/resolve/${id}`, request.url);
      return NextResponse.redirect(newUrl);
    }
  }

  // /profiles/* redirect
  if (pathname.startsWith("/profiles/") && pathname.length > 10) {
    const id = pathname.substring(10); // everything after /profiles/
    if (id) {
      const newUrl = new URL(`/api/steam/resolve/${id}`, request.url);
      return NextResponse.redirect(newUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
