import { requireRequestAuth } from "@/lib/api/route-auth";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { payrollService } from "@/server/workforce/payroll-export/payroll.service";

type RouteParams = { organisation: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;
  let body: { payPeriodId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return validationErrorResponse("Invalid JSON", 400, "internal_error");
  }

  if (!body.payPeriodId) {
    return validationErrorResponse("payPeriodId is required", 400, "internal_error");
  }

  try {
    const data = await payrollService.prepareRun(ctx, {
      organisationSlug: organisation,
      payPeriodId: body.payPeriodId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "payroll-export", { defaultCode: "internal_error" });
  }
}
