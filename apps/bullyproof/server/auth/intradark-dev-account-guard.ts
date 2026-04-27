import {
  INTRADARK_DEV_PLATFORM_ROLE_KEY,
} from "@/lib/intradark-dev-protection";
import { getUserScopedRoles, hasPlatformRole } from "./rbac";

const FORBIDDEN_MESSAGE =
  "Only Intradark developers can modify this account";

/**
 * When the target user holds INTRADARK_DEV, only actors with INTRADARK_DEV may change them.
 */
export async function assertActorCanManageIntradarkDevTarget(
  actorUserId: string,
  targetUserId: string
): Promise<void> {
  const target = await getUserScopedRoles(targetUserId);
  if (!hasPlatformRole(target, INTRADARK_DEV_PLATFORM_ROLE_KEY)) return;

  const actor = await getUserScopedRoles(actorUserId);
  if (!hasPlatformRole(actor, INTRADARK_DEV_PLATFORM_ROLE_KEY)) {
    throw new Error(FORBIDDEN_MESSAGE);
  }
}

/** Assigning the INTRADARK_DEV role requires the actor to hold INTRADARK_DEV. */
export async function assertActorCanAssignIntradarkDevRole(
  actorUserId: string,
  roleKey: string | null | undefined
): Promise<void> {
  if (roleKey !== INTRADARK_DEV_PLATFORM_ROLE_KEY) return;

  const actor = await getUserScopedRoles(actorUserId);
  if (!hasPlatformRole(actor, INTRADARK_DEV_PLATFORM_ROLE_KEY)) {
    throw new Error("Only Intradark developers can assign this role");
  }
}
