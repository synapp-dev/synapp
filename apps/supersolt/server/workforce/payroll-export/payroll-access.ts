import type { UserTenantRoles } from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import {
  canApprovePayrollRun,
  canExecutePayrollPayment,
  canPreparePayrollRun,
  canViewFdvPayrollLines,
} from "@/server/auth/capabilities";

export function assertCanPreparePayroll(
  tenantRoles: UserTenantRoles,
  organisationId: string,
): void {
  if (!canPreparePayrollRun(tenantRoles, organisationId)) {
    throw new AuthError(403, "Forbidden");
  }
}

export function assertCanApprovePayroll(
  tenantRoles: UserTenantRoles,
  organisationId: string,
): void {
  if (!canApprovePayrollRun(tenantRoles, organisationId)) {
    throw new AuthError(403, "Forbidden");
  }
}

export function assertCanExecutePayroll(
  tenantRoles: UserTenantRoles,
  organisationId: string,
): void {
  if (!canExecutePayrollPayment(tenantRoles, organisationId)) {
    throw new AuthError(403, "Forbidden");
  }
}

export function viewerCanSeeFdv(
  tenantRoles: UserTenantRoles,
  organisationId: string,
): boolean {
  return canViewFdvPayrollLines(tenantRoles, organisationId);
}
