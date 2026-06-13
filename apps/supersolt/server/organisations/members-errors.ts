export type PermissionsErrorCode =
  | "permissions.forbidden"
  | "permissions.not_found"
  | "permissions.invalid_email"
  | "permissions.invalid_role"
  | "permissions.invalid_venues"
  | "permissions.duplicate_member"
  | "permissions.duplicate_invite"
  | "permissions.invite_expired"
  | "permissions.invite_revoked"
  | "permissions.last_owner"
  | "permissions.email_delivery_failed"
  | "permissions.xero_not_connected"
  | "permissions.xero_import_empty"
  | "permissions.internal_error";

const STATUS_BY_CODE: Record<PermissionsErrorCode, number> = {
  "permissions.forbidden": 403,
  "permissions.not_found": 404,
  "permissions.invalid_email": 400,
  "permissions.invalid_role": 400,
  "permissions.invalid_venues": 400,
  "permissions.duplicate_member": 409,
  "permissions.duplicate_invite": 409,
  "permissions.invite_expired": 410,
  "permissions.invite_revoked": 410,
  "permissions.last_owner": 400,
  "permissions.email_delivery_failed": 502,
  "permissions.xero_not_connected": 422,
  "permissions.xero_import_empty": 422,
  "permissions.internal_error": 500,
};

export class MembersServiceError extends Error {
  status: number;
  code: PermissionsErrorCode;

  constructor(
    code: PermissionsErrorCode,
    message: string,
    status = STATUS_BY_CODE[code],
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function httpStatusForPermissionsCode(code: PermissionsErrorCode): number {
  return STATUS_BY_CODE[code];
}
