import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { payrollService } from "@/server/workforce/payroll-export/payroll.service";

type RouteParams = { organisation: string; payRunId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, payRunId } = await context.params;
  let body: { venue?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.venue) {
    return NextResponse.json(
      { data: null, error: { message: "venue is required", status: 400, code: "internal_error" } },
      { status: 400 },
    );
  }

  try {
    const data = await payrollService.retryXeroPush(ctx, {
      organisationSlug: organisation,
      payRunId,
      venueSlug: body.venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "payroll-export", { defaultCode: "internal_error" });
  }
}
