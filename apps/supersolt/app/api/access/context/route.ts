import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { loadAccessContextForUser } from "@/server/access/load-access-context-for-user";

export async function GET(request: Request) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const result = await loadAccessContextForUser(ctx.appDb, ctx.userId);
  if (result.error) {
    return validationErrorResponse(result.error.message, 500);
  }

  return jsonDataResponse(result.data);
}
