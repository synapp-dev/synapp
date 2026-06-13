import { describe, expect, it } from "vitest";
import {
  canArchiveMember,
  canDemoteMember,
  isAssignableRoleSlug,
  isInviteExpired,
  mergeMembersList,
  normalizeInviteEmail,
  parseBulkEmails,
} from "@/server/organisations/members-policy";
import { OWNER_ROLE_ID } from "@/server/organisations/members-policy";

describe("members-policy", () => {
  it("normalizes invite email", () => {
    expect(normalizeInviteEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  it("validates assignable roles", () => {
    expect(isAssignableRoleSlug("admin")).toBe(true);
    expect(isAssignableRoleSlug("owner")).toBe(false);
    expect(isAssignableRoleSlug("supervisor")).toBe(false);
  });

  it("detects expired invites", () => {
    const past = new Date("2020-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(isInviteExpired(past.toISOString(), now)).toBe(true);
    expect(isInviteExpired("2099-12-31T00:00:00.000Z", now)).toBe(false);
  });

  it("blocks archiving last owner", () => {
    expect(
      canArchiveMember({
        roleId: OWNER_ROLE_ID,
        ownerRoleId: OWNER_ROLE_ID,
        activeOwnerCount: 1,
      }),
    ).toBe(false);
  });

  it("allows demote when multiple owners", () => {
    expect(
      canDemoteMember({
        currentRoleId: OWNER_ROLE_ID,
        newRoleId: "other-id",
        ownerRoleId: OWNER_ROLE_ID,
        activeOwnerCount: 2,
      }),
    ).toBe(true);
  });

  it("parses bulk emails with errors", () => {
    const result = parseBulkEmails("a@b.com\nnot-an-email\na@b.com");
    expect(result.valid).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("merges member and invite lists", () => {
    const merged = mergeMembersList({
      members: [
        {
          kind: "member",
          id: "1",
          userProfileId: "p1",
          name: "Zed",
          email: "z@x.com",
          roleSlug: "crew",
          roleDisplayName: "Staff",
          venueIds: [],
          status: "active",
          positionDisplayName: null,
          expiresAt: null,
        },
      ],
      invites: [
        {
          kind: "invite",
          id: "2",
          userProfileId: null,
          name: "amy",
          email: "a@x.com",
          roleSlug: "crew",
          roleDisplayName: "Staff",
          venueIds: [],
          status: "pending",
          positionDisplayName: null,
          expiresAt: null,
        },
      ],
    });
    expect(merged).toHaveLength(2);
    expect(merged[0]?.email).toBe("a@x.com");
  });
});
