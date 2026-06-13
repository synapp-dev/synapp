import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import { peopleService } from "@/server/workforce/people.service";

type RouteParams = { organisation: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;
  const url = new URL(request.url);
  const venueId = url.searchParams.get("venueId") ?? undefined;
  const venueSlug = url.searchParams.get("venueSlug") ?? undefined;

  try {
    const data = await peopleService.listForOrganisation(ctx, {
      organisationSlug: organisation,
      venueId,
      venueSlug,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "people");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const admin = createSupabaseAdmin();
  if (!admin) {
    return validationErrorResponse(
      "Invites require SUPABASE_SERVICE_ROLE_KEY.",
      503,
      "internal_error",
    );
  }

  const { organisation } = await context.params;
  const origin = new URL(request.url).origin;

  let body: {
    email?: string;
    roleSlug?: string;
    venueIds?: string[];
    employmentType?: "full_time" | "part_time" | "casual" | "fixed_term";
    startDate?: string;
    awardCode?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return validationErrorResponse("Invalid JSON", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const roleSlug = typeof body.roleSlug === "string" ? body.roleSlug.trim() : "crew";
  const venueIds = Array.isArray(body.venueIds)
    ? body.venueIds.filter((v): v is string => typeof v === "string")
    : [];

  if (!email || venueIds.length === 0) {
    return validationErrorResponse("email and venueIds are required", 422, "duplicate_email");
  }

  try {
    const data = await peopleService.createEmployeeInvite(ctx, admin, {
      organisationSlug: organisation,
      email,
      roleSlug,
      venueIds,
      redirectTo: `${origin}/auth/callback`,
      employment: {
        employmentType: body.employmentType,
        startDate: body.startDate,
        awardCode: body.awardCode,
      },
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "people");
  }
}
