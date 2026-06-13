
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import {
  organisationMembersService,
  OrganisationMembersServiceError,
} from "@/server/organisations/organisation-members.service";

type RouteParams = {
  organisation: string;
};

type PostBody = {
  email?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation } = await context.params;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return validationErrorResponse("Invalid JSON", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return validationErrorResponse("email is required", 400);
  }

  try {
    const data = await organisationMembersService.checkMemberEmail(ctx, {
      organisationSlug: organisation,
      email,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "members");
  }
}
