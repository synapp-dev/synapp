import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/supabase";
import { createServerClient } from "@supabase/ssr";

/**
 * Helper function to copy cookies from source response to target response.
 * This is critical for maintaining Supabase session state during redirects.
 */
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
  let supabaseResponse = NextResponse.next({
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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Define public routes that don't require authentication
  const publicRoutes = ["/auth", "/logout"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow public API routes (e.g., /api/states)
  const isPublicApiRoute = pathname.startsWith("/api/states");

  // Handle root path redirects based on authentication status
  if (pathname === "/") {
    const redirectUrl = user ? "/dashboard" : "/auth";
    const redirectResponse = NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  // Protect all routes except public routes and public API routes
  if (!isPublicRoute && !isPublicApiRoute && !user) {
    const redirectResponse = NextResponse.redirect(
      new URL("/auth", request.url)
    );
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (isPublicRoute && user && pathname !== "/logout") {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
