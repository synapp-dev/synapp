import { describe, expect, it } from "vitest";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { enrichUserSchoolRoles } from "./enrich-user-school-roles";

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
      schoolId: "millaroo-id",
      schoolName: null,
      roleKey: "TEACHER",
      roleName: null,
    },
  ],
  lastLoginAt: null,
};

describe("enrichUserSchoolRoles", () => {
  it("fills school and role names from catalog", () => {
    const enriched = enrichUserSchoolRoles(baseUser, {
      schools: [{ id: "millaroo-id", name: "Millaroo State School" }],
      roles: [{ key: "TEACHER", name: "AP Teacher" }],
    });

    expect(enriched.schoolRoles[0]?.schoolName).toBe("Millaroo State School");
    expect(enriched.schoolRoles[0]?.roleName).toBe("AP Teacher");
  });

  it("preserves names from previous snapshot when API omits them", () => {
    const enriched = enrichUserSchoolRoles(baseUser, {
      previousSchoolRoles: [
        {
          schoolId: "millaroo-id",
          schoolName: "Millaroo State School",
          roleKey: "TEACHER",
          roleName: "AP Teacher",
        },
      ],
    });

    expect(enriched.schoolRoles[0]?.schoolName).toBe("Millaroo State School");
    expect(enriched.schoolRoles[0]?.roleName).toBe("AP Teacher");
  });
});
