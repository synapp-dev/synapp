import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Database = Record<string, never>;

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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isMainRoute =
    pathname.startsWith("/home") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/agent") ||
    pathname.startsWith("/knowledge") ||
    pathname.startsWith("/review") ||
    pathname.startsWith("/identity") ||
    pathname.startsWith("/health") ||
    pathname.startsWith("/work") ||
    pathname.startsWith("/social") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile");

  if (pathname === "/") {
    const target = user ? "/dashboard" : "/auth";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!user && isMainRoute) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
