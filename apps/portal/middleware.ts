import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseJWT } from "./utils/verifySupabaseJWT";
import { CheckOrgAccess } from "./providers/postgres/services/check-org-access";

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const isApiRoute = pathname.startsWith('/api/');
  
  let userId: string;

  if (isApiRoute) {
    // For API routes, require authorization header
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
      userId = payload.payload.sub as string;
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Extract organization from API URL path
    const excludedRoutes = ['home', 'settings', 'auth', 'api', 'logout'];
    const orgPatterns = [
      /^\/api\/organisations\/([^\/]+)/,  // /api/organisations/[org]
    ];
    
    let organizationIdentifier: string | null = null;
    
    // Try to match against each pattern
    for (const pattern of orgPatterns) {
      const match = pathname.match(pattern);
      if (match && match[1]) {
        // Skip if this matches an excluded route
        if (excludedRoutes.includes(match[1])) {
          continue;
        }
        organizationIdentifier = match[1];
        break;
      }
    }
    
    // If we found an organization identifier, check access
    if (organizationIdentifier) {
      // Determine if it's likely a slug (non-UUID format) or ID
      const isSlug = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationIdentifier);
      
      const hasOrgAccess = await CheckOrgAccess(userId, organizationIdentifier, isSlug);
      
      if (!hasOrgAccess) {
        return NextResponse.json(
          { error: "Unauthorized: You don't have access to this organization" }, 
          { status: 403 }
        );
      }
    }

    // Clone the request and add the user ID as a custom header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", userId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } else {
    // For frontend routes, check for session cookie or redirect to auth
    // TODO: Implement proper session checking for frontend routes
    // For now, skip auth check for frontend routes and let page components handle it
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
