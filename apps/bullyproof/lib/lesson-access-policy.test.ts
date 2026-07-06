import { describe, expect, it } from "vitest";
import {
  hasSchoolMembership,
  isAdminRestrictedForLessonCreate,
  normalizePlatformRoles,
  shouldIncludeLessonInActiveConflicts,
} from "./lesson-access-policy";

describe("lesson-access-policy", () => {
  it("normalizes PostgreSQL platform role strings", () => {
    expect(normalizePlatformRoles("{PLATFORM_ADMIN,TEACHER}")).toEqual([
      "PLATFORM_ADMIN",
      "TEACHER",
    ]);
  });

  it("detects admin-restricted lesson create roles", () => {
    expect(isAdminRestrictedForLessonCreate(["TEACHER"])).toBe(false);
    expect(isAdminRestrictedForLessonCreate(["PLATFORM_ADMIN"])).toBe(true);
  });

  it("matches school membership case-insensitively", () => {
    expect(
      hasSchoolMembership(
        [{ schoolId: "ABC-1111-1111-1111-111111111111" }],
        "abc-1111-1111-1111-111111111111"
      )
    ).toBe(true);
  });

  it("excludes other teachers feedback lessons from active conflicts", () => {
    expect(
      shouldIncludeLessonInActiveConflicts(
        { status: "feedback", createdByUserId: "owner-1" },
        "viewer-2"
      )
    ).toBe(false);
    expect(
      shouldIncludeLessonInActiveConflicts(
        { status: "feedback", createdByUserId: "owner-1" },
        "owner-1"
      )
    ).toBe(true);
    expect(
      shouldIncludeLessonInActiveConflicts(
        { status: "in_progress", createdByUserId: "owner-1" },
        "viewer-2"
      )
    ).toBe(true);
  });
});
