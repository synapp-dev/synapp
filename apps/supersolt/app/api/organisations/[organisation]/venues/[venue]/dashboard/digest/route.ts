// Digest output format v2: summary paragraph + typed @slug action markers.
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse } from "@/lib/api/service-error-response";
import { dashboardDigestService } from "@/server/dashboard/dashboard-digest.service";

type RouteParams = { organisation: string; venue: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  let force = false;
  try {
    const body = (await request.json()) as { force?: boolean } | null;
    force = body?.force === true;
  } catch {
    // No/invalid body — default to cached-if-fresh.
  }

  try {
    return await dashboardDigestService.streamDigest(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      force,
    });
  } catch (error) {
    return serviceErrorResponse(error, "dashboard-digest");
  }
}
