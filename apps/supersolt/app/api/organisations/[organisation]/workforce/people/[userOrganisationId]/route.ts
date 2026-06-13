import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { peopleService } from "@/server/workforce/people.service";

type RouteParams = {
  organisation: string;
  userOrganisationId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, userOrganisationId } = await context.params;

  try {
    const employee = await peopleService.getEmployee(ctx, {
      organisationSlug: organisation,
      userOrganisationId,
    });
    return jsonDataResponse({ employee });
  } catch (error) {
    return serviceErrorResponse(error, "people");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, userOrganisationId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return serviceErrorResponse(
      Object.assign(new Error("Invalid JSON"), { status: 400 }),
      "people",
    );
  }

  try {
    const result = await peopleService.updateEmployee(ctx, {
      organisationSlug: organisation,
      userOrganisationId,
      patch: {
        firstName: typeof body.firstName === "string" ? body.firstName : undefined,
        lastName: typeof body.lastName === "string" ? body.lastName : undefined,
        preferredName:
          body.preferredName === null || typeof body.preferredName === "string"
            ? (body.preferredName as string | null)
            : undefined,
        phone:
          body.phone === null || typeof body.phone === "string"
            ? (body.phone as string | null)
            : undefined,
        startDate: typeof body.startDate === "string" ? body.startDate : undefined,
        continuousServiceStartDate:
          typeof body.continuousServiceStartDate === "string"
            ? body.continuousServiceStartDate
            : undefined,
        employmentType:
          body.employmentType === "full_time" ||
          body.employmentType === "part_time" ||
          body.employmentType === "casual" ||
          body.employmentType === "fixed_term"
            ? body.employmentType
            : undefined,
        awardCode:
          body.awardCode === null || typeof body.awardCode === "string"
            ? (body.awardCode as string | null)
            : undefined,
        classificationLevel:
          body.classificationLevel === null || typeof body.classificationLevel === "string"
            ? (body.classificationLevel as string | null)
            : undefined,
        classificationGrade:
          body.classificationGrade === null || typeof body.classificationGrade === "string"
            ? (body.classificationGrade as string | null)
            : undefined,
        payRateCents: typeof body.payRateCents === "number" ? body.payRateCents : undefined,
        payRatePeriod: typeof body.payRatePeriod === "string" ? body.payRatePeriod : undefined,
        fwisIssuedDate:
          body.fwisIssuedDate === null || typeof body.fwisIssuedDate === "string"
            ? (body.fwisIssuedDate as string | null)
            : undefined,
        ceisIssuedDate:
          body.ceisIssuedDate === null || typeof body.ceisIssuedDate === "string"
            ? (body.ceisIssuedDate as string | null)
            : undefined,
        awardOverrideReason:
          typeof body.awardOverrideReason === "string" ? body.awardOverrideReason : undefined,
      },
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "people");
  }
}
