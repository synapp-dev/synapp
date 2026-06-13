import type { UserTenantRoles } from "@/server/auth/rbac";
import {
  canApproveLargeVarianceStockCount,
  canApproveStockCount,
  canCreateStockCount,
  canRunStockCount,
} from "@/server/auth/capabilities";

export type StockCountStatus =
  | "scheduled"
  | "in_progress"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "archived";

export type StockCountAction =
  | "edit"
  | "pause"
  | "submit"
  | "approve"
  | "reject"
  | "request-recount"
  | "set-remaining-zero"
  | "reopen"
  | "export";

const VALID_TRANSITIONS: Record<StockCountStatus, StockCountStatus[]> = {
  scheduled: ["in_progress", "archived"],
  in_progress: ["in_progress", "pending_approval", "archived"],
  pending_approval: ["in_progress", "approved", "rejected"],
  approved: ["in_progress"],
  rejected: ["in_progress"],
  archived: [],
};

export function assertValidStatusTransition(
  from: StockCountStatus,
  to: StockCountStatus,
): void {
  if (from === to) return;
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}

export function buildAllowedActions(args: {
  status: StockCountStatus;
  roles: UserTenantRoles;
  organisationId: string;
  assigneeUserId: string | null;
  userId: string;
  largeVarianceOwnerRequired: boolean;
}): StockCountAction[] {
  const actions: StockCountAction[] = [];

  if (args.status === "in_progress" || args.status === "scheduled") {
    if (
      canRunStockCount(args.roles, args.organisationId, {
        assigneeUserId: args.assigneeUserId,
        userId: args.userId,
      })
    ) {
      actions.push("edit", "pause", "submit", "set-remaining-zero");
    }
  }

  if (args.status === "pending_approval") {
    const canApprove = args.largeVarianceOwnerRequired
      ? canApproveLargeVarianceStockCount(args.roles, args.organisationId)
      : canApproveStockCount(args.roles, args.organisationId);
    if (canApprove) {
      actions.push("approve", "reject", "request-recount");
    }
  }

  if (args.status === "approved") {
    if (canApproveStockCount(args.roles, args.organisationId)) {
      actions.push("reopen", "export");
    } else {
      actions.push("export");
    }
  }

  if (args.status === "approved" || args.status === "pending_approval") {
    if (!actions.includes("export")) {
      actions.push("export");
    }
  }

  return [...new Set(actions)];
}

export function assertCanCreate(
  roles: UserTenantRoles,
  organisationId: string,
): void {
  if (!canCreateStockCount(roles, organisationId)) {
    throw new Error("Forbidden");
  }
}
