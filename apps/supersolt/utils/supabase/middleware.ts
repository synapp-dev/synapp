import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/utils/supabase/types";

function copyCookies(
  sourceResponse: NextResponse,
  targetResponse: NextResponse
): void {
  sourceResponse.cookies.getAll().forEach((cookie) => {
    targetResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      sameSite: cookie.sameSite as "lax" | "strict" | "none" | undefined,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      maxAge: cookie.maxAge,
      expires: cookie.expires,
    });
  });
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const rootMainPrefixes = ["/dashboard", "/support", "/settings", "/logout"];
  const reservedTopLevelSegments = new Set([
    "auth",
    "dashboard",
    "support",
    "settings",
    "logout",
    "api",
    "_next",
  ]);
  const isRootMainRoute = rootMainPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const pathSegments = pathname.split("/").filter(Boolean);
  const hasScopedMainRoute =
    pathSegments.length >= 2 &&
    !reservedTopLevelSegments.has(pathSegments[0] ?? "");
  const isMainRoute = isRootMainRoute || hasScopedMainRoute;

  if (pathname === "/") {
    const target = user ? "/dashboard" : "/auth";
    const redirectResponse = NextResponse.redirect(new URL(target, request.url));
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (!user && isMainRoute) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && isAuthRoute) {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}
