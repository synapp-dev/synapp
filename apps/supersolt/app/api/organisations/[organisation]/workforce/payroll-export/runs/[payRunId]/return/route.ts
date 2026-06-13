
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
  let body: { notes?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const data = await payrollService.returnToManager(ctx, {
      organisationSlug: organisation,
      payRunId,
      notes: body.notes ?? "",
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "payroll-export", { defaultCode: "internal_error" });
  }
}
