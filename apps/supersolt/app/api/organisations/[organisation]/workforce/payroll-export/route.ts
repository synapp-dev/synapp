import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { payrollService } from "@/server/workforce/payroll-export/payroll.service";

type RouteParams = { organisation: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;
  const url = new URL(request.url);
  const venue = url.searchParams.get("venue") ?? "";

  if (!venue) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "venue query param is required", status: 400, code: "internal_error" },
      },
      { status: 400 },
    );
  }

  try {
    const data = await payrollService.getPageData(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "payroll-export", { defaultCode: "internal_error" });
  }
}
