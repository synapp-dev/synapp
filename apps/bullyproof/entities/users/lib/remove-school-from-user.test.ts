import { describe, expect, it } from "vitest";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { removeSchoolRolesFromUser } from "./remove-school-from-user";

const baseUser: UserWithRolesAndSchools = {
  id: "u1",
  firstName: "A",
  lastName: "B",
  email: "a@school.edu",
  avatarUrl: null,
  createdAt: null,
  updatedAt: null,
  metadata: null,
  platformRoles: [],
  schoolRoles: [
    {
      schoolId: "school-a",
      schoolName: "School A",
      roleKey: "TEACHER",
      roleName: "Teacher",
    },
    {
      schoolId: "school-a",
      schoolName: "School A",
      roleKey: "SCHOOL_STAFF",
      roleName: "Staff",
    },
    {
      schoolId: "school-b",
      schoolName: "School B",
      roleKey: "SCHOOL_ADMIN",
      roleName: "Admin",
    },
  ],
  lastLoginAt: null,
};

describe("removeSchoolRolesFromUser", () => {
  it("removes only roles for the given school", () => {
    const next = removeSchoolRolesFromUser(baseUser, "school-a");

    expect(next.schoolRoles).toHaveLength(1);
    expect(next.schoolRoles[0]?.schoolId).toBe("school-b");
    expect(next.id).toBe(baseUser.id);
  });

  it("returns user unchanged when school has no roles", () => {
    const next = removeSchoolRolesFromUser(baseUser, "unknown-school");

    expect(next.schoolRoles).toHaveLength(3);
  });
});
