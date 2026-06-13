
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { createSupabaseAdmin } from "@/utils/supabase/admin";

import {
  venueStaffAssignmentService,
  VenueStaffAssignmentError,
} from "@/server/venues/venue-staff-assignment.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  try {
    const data = await venueStaffAssignmentService.listOrgMembersForVenue(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "staff-assignment");
  }
}

type PostBody = {
  userOrganisationIds?: string[];
  venueRoleSlug?: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return validationErrorResponse("Invalid JSON", 400);
  }

  const userOrganisationIds = Array.isArray(body.userOrganisationIds)
    ? body.userOrganisationIds
    : [];

  try {
    const data = await venueStaffAssignmentService.assignVenueAccess(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      userOrganisationIds,
      venueRoleSlug:
        body.venueRoleSlug === undefined
          ? null
          : typeof body.venueRoleSlug === "string"
            ? body.venueRoleSlug
            : null,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "staff-assignment");
  }
}
