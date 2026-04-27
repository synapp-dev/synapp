import { z } from "zod";
import { assertFeature } from "@/server/features/features.service";
import { SYSTEM_FEATURES } from "@/lib/feature-keys";
import { VIEW_AS_USER_ID_HEADER } from "@/lib/view-as-http";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export type ResourcesAuthResult =
  | { kind: "ok"; userId: string; actorUserId: string }
  | { kind: "unauthorized" }
  | { kind: "invalid_view_as" }
  | { kind: "forbidden_impersonation" };

const uuidSchema = z.string().uuid();

/**
 * Resolves effective user for resources APIs: JWT user as actor; optional view-as header
 * when actor has system:impersonate.
 */
export async function getResourcesAuthFromRequest(
  request: Request
): Promise<ResourcesAuthResult> {
  const actorUserId = await getUserIdFromRequest(request);
  if (!actorUserId) {
    return { kind: "unauthorized" };
  }

  const raw = request.headers.get(VIEW_AS_USER_ID_HEADER)?.trim();
  if (!raw) {
    return { kind: "ok", userId: actorUserId, actorUserId };
  }

  const parsed = uuidSchema.safeParse(raw);
  if (!parsed.success) {
    return { kind: "invalid_view_as" };
  }

  try {
    await assertFeature({ userId: actorUserId }, SYSTEM_FEATURES.IMPERSONATE);
  } catch {
    return { kind: "forbidden_impersonation" };
  }

  return { kind: "ok", userId: parsed.data, actorUserId };
}

export function resourcesAuthErrorStatus(
  err: Exclude<ResourcesAuthResult, { kind: "ok" }>
): { status: number; message: string } {
  switch (err.kind) {
    case "unauthorized":
      return { status: 401, message: "Unauthorized" };
    case "invalid_view_as":
      return { status: 400, message: "Invalid view-as user id" };
    case "forbidden_impersonation":
      return { status: 403, message: "Forbidden" };
  }
}
