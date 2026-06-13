import type { ReadinessModuleId } from "@/entities/readiness/model/types";
import type { RequestAuthContext } from "@/server/auth/context";
import { assertVenueModuleReady } from "@/server/readiness/readiness.service";
import { handleReadinessRouteError } from "@/server/readiness/readiness-route-response";

export async function guardReadinessApiRoute(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    moduleId: ReadinessModuleId;
  },
) {
  try {
    await assertVenueModuleReady(ctx, args);
  } catch (error) {
    return handleReadinessRouteError(error);
  }
  return null;
}
