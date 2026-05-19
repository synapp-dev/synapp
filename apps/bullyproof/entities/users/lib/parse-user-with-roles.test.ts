import { describe, expect, it } from "vitest";
import { parseUserWithRoles } from "./parse-user-with-roles";

describe("parseUserWithRoles", () => {
  it("maps array schoolRoles and platformRoles", () => {
    const user = parseUserWithRoles({
      id: "u1",
      email: "a@school.edu",
      platformRoles: ["PLATFORM_ADMIN"],
      schoolRoles: [
        {
          schoolId: "s1",
          schoolName: "Test School",
          roleKey: "TEACHER",
          roleName: "AP Teacher",
        },
      ],
    });

    expect(user.platformRoles).toEqual(["PLATFORM_ADMIN"]);
    expect(user.schoolRoles).toHaveLength(1);
    expect(user.schoolRoles[0]?.schoolId).toBe("s1");
    expect(user.lastLoginAt).toBeNull();
  });

  it("parses JSON string roles from the view", () => {
    const user = parseUserWithRoles({
      id: "u2",
      email: "b@school.edu",
      platformRoles: '["GOVERNMENT"]',
      schoolRoles: JSON.stringify([
        {
          schoolId: "s2",
          schoolName: "Other",
          roleKey: "SCHOOL_STAFF",
          roleName: "Staff",
        },
      ]),
    });

    expect(user.platformRoles).toEqual(["GOVERNMENT"]);
    expect(user.schoolRoles[0]?.roleKey).toBe("SCHOOL_STAFF");
  });

  it("returns empty role arrays when missing", () => {
    const user = parseUserWithRoles({
      id: "u3",
      email: "c@school.edu",
    });

    expect(user.platformRoles).toEqual([]);
    expect(user.schoolRoles).toEqual([]);
  });
});
