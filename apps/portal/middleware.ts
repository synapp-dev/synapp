import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseJWT } from "./utils/verifySupabaseJWT";

export async function middleware(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "No authorization header" },
      { status: 401 }
    );
  }
  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = await verifySupabaseJWT(token);
    const userId = payload.payload.sub as string;

    // Clone the request and add the user ID as a custom header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", userId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
