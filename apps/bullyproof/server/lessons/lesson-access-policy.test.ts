import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertCanAccessClassesInSchools,
  assertCanManageLessons,
  assertCanViewLessons,
  evaluateLessonAccess,
} from "./lesson-access-policy";

vi.mock("@/server/features/features.service", () => ({
  checkFeatureAccess: vi.fn(),
}));

vi.mock("@/server/auth/rbac", () => ({
  getUserScopedRoles: vi.fn(),
}));

import { checkFeatureAccess } from "@/server/features/features.service";
import { getUserScopedRoles } from "@/server/auth/rbac";

const mockedCheckFeatureAccess = vi.mocked(checkFeatureAccess);
const mockedGetUserScopedRoles = vi.mocked(getUserScopedRoles);

describe("lesson-access-policy (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants view via admin lessons feature", async () => {
    mockedCheckFeatureAccess.mockImplementation(async (_userId, feature) => {
      return feature === "/admin/lessons";
    });
    mockedGetUserScopedRoles.mockResolvedValue({ platform: [], school: [] });

    const decision = await evaluateLessonAccess(
      { userId: "admin-1" },
      { schoolId: "school-1" }
    );

    expect(decision.canView).toBe(true);
    expect(decision.canManage).toBe(true);
  });

  it("grants view to lesson owner without school feature", async () => {
    mockedCheckFeatureAccess.mockResolvedValue(false);
    mockedGetUserScopedRoles.mockResolvedValue({ platform: [], school: [] });

    const decision = await evaluateLessonAccess(
      { userId: "teacher-1" },
      { lessonOwnerId: "teacher-1", schoolId: "school-1" }
    );

    expect(decision.canView).toBe(true);
    expect(decision.canManage).toBe(true);
  });

  it("grants view to school member with lessons feature", async () => {
    mockedCheckFeatureAccess.mockImplementation(async (_userId, feature, schoolId) => {
      return feature === "/school/lessons" && schoolId === "school-1";
    });
    mockedGetUserScopedRoles.mockResolvedValue({
      platform: [],
      school: [{ roleKey: "SCHOOL_ADMIN", schoolId: "school-1" }],
    });

    await expect(
      assertCanViewLessons({ userId: "user-1" }, undefined, "school-1")
    ).resolves.toBeUndefined();
  });

  it("denies manage when not owner and no school access", async () => {
    mockedCheckFeatureAccess.mockResolvedValue(false);
    mockedGetUserScopedRoles.mockResolvedValue({
      platform: [],
      school: [{ roleKey: "TEACHER", schoolId: "other-school" }],
    });

    await expect(
      assertCanManageLessons({ userId: "user-1" }, "owner-2", "school-1")
    ).rejects.toThrow("Unauthorized to manage lessons");
  });

  it("requires lessons feature for each school in class access check", async () => {
    mockedCheckFeatureAccess.mockImplementation(async (_userId, feature, schoolId) => {
      return feature === "/school/lessons" && schoolId === "school-a";
    });
    mockedGetUserScopedRoles.mockResolvedValue({
      platform: [],
      school: [
        { roleKey: "TEACHER", schoolId: "school-a" },
        { roleKey: "TEACHER", schoolId: "school-b" },
      ],
    });

    await expect(
      assertCanAccessClassesInSchools({ userId: "user-1" }, [
        "school-a",
        "school-b",
      ])
    ).rejects.toThrow("Unauthorized to access one or more classes");
  });
});
