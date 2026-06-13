import { describe, expect, it } from "vitest";
import {
  httpStatusForPermissionsCode,
  MembersServiceError,
  type PermissionsErrorCode,
} from "@/server/organisations/members-errors";

const ALL_CODES: PermissionsErrorCode[] = [
  "permissions.forbidden",
  "permissions.not_found",
  "permissions.invalid_email",
  "permissions.invalid_role",
  "permissions.invalid_venues",
  "permissions.duplicate_member",
  "permissions.duplicate_invite",
  "permissions.invite_expired",
  "permissions.invite_revoked",
  "permissions.last_owner",
  "permissions.email_delivery_failed",
  "permissions.xero_not_connected",
  "permissions.xero_import_empty",
  "permissions.internal_error",
];

describe("members-errors", () => {
  it.each(ALL_CODES)("maps %s to a stable HTTP status", (code) => {
    const status = httpStatusForPermissionsCode(code);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(600);
  });

  it("MembersServiceError carries code and status", () => {
    const err = new MembersServiceError(
      "permissions.last_owner",
      "Cannot demote the last owner",
    );
    expect(err.code).toBe("permissions.last_owner");
    expect(err.status).toBe(400);
    expect(err.message).toBe("Cannot demote the last owner");
  });
});
