import { describe, expect, it } from "vitest";
import {
  ADMIN_CANNOT_CREATE_LESSON_KEYS,
  BULLYPROOF_PLATFORM_ROLE_KEYS,
  PLATFORM_ROLE_KEYS,
  ROLE_EXCLUSIVITY_PLATFORM_KEYS,
  ROLE_KEYS,
  ROLE_PRIORITY,
  SCHOOL_ROLE_KEYS,
  getRolePriority,
  isPlatformRoleKey,
  isSchoolRoleKey,
  sortPlatformRoles,
} from "./role-keys";

const ALL_KEYS = Object.values(ROLE_KEYS);

describe("role catalog scope split", () => {
  it("every role key is platform or school scoped, never both", () => {
    for (const key of ALL_KEYS) {
      expect(
        isPlatformRoleKey(key) !== isSchoolRoleKey(key),
        `${key} must belong to exactly one scope`
      ).toBe(true);
    }
  });

  it("platform and school sets cover the whole catalog", () => {
    expect([...PLATFORM_ROLE_KEYS, ...SCHOOL_ROLE_KEYS].sort()).toEqual(
      [...ALL_KEYS].sort()
    );
  });

  it("unknown keys belong to neither scope", () => {
    expect(isPlatformRoleKey("NOT_A_ROLE")).toBe(false);
    expect(isSchoolRoleKey("NOT_A_ROLE")).toBe(false);
    expect(isPlatformRoleKey(null)).toBe(false);
    expect(isSchoolRoleKey(undefined)).toBe(false);
  });
});

describe("membership groups", () => {
  it("bullyproof staff group is the platform set minus the government viewer", () => {
    expect([...BULLYPROOF_PLATFORM_ROLE_KEYS].sort()).toEqual(
      PLATFORM_ROLE_KEYS.filter((k) => k !== ROLE_KEYS.GOVERNMENT_VIEWER).sort()
    );
  });

  it("cannot-create-lesson group is a platform subset", () => {
    for (const key of ADMIN_CANNOT_CREATE_LESSON_KEYS) {
      expect(isPlatformRoleKey(key)).toBe(true);
    }
  });

  it("exclusivity trio preserves the historic behaviour: dev and moderator excluded", () => {
    for (const key of ROLE_EXCLUSIVITY_PLATFORM_KEYS) {
      expect(isPlatformRoleKey(key)).toBe(true);
    }
    expect(ROLE_EXCLUSIVITY_PLATFORM_KEYS).not.toContain(
      ROLE_KEYS.INTRADARK_DEV
    );
    expect(ROLE_EXCLUSIVITY_PLATFORM_KEYS).not.toContain(
      ROLE_KEYS.PLATFORM_MODERATOR
    );
  });
});

describe("priority order", () => {
  it("assigns a unique rank to every role", () => {
    const ranks = ALL_KEYS.map((k) => ROLE_PRIORITY[k]);
    expect(new Set(ranks).size).toBe(ALL_KEYS.length);
  });

  it("ranks every school role ahead of every platform role", () => {
    const worstSchool = Math.max(
      ...SCHOOL_ROLE_KEYS.map((k) => ROLE_PRIORITY[k])
    );
    const bestPlatform = Math.min(
      ...PLATFORM_ROLE_KEYS.map((k) => ROLE_PRIORITY[k])
    );
    expect(worstSchool).toBeLessThan(bestPlatform);
  });

  it("keeps platform seniority: dev, admin, moderator, staff, government", () => {
    const ordered = [...PLATFORM_ROLE_KEYS].sort(
      (a, b) => ROLE_PRIORITY[a] - ROLE_PRIORITY[b]
    );
    expect(ordered).toEqual([
      ROLE_KEYS.INTRADARK_DEV,
      ROLE_KEYS.PLATFORM_ADMIN,
      ROLE_KEYS.PLATFORM_MODERATOR,
      ROLE_KEYS.PLATFORM_STAFF,
      ROLE_KEYS.GOVERNMENT_VIEWER,
    ]);
  });

  it("sends unknown and missing keys to the back", () => {
    expect(getRolePriority("NOT_A_ROLE")).toBe(Number.MAX_SAFE_INTEGER);
    expect(getRolePriority(null)).toBe(Number.MAX_SAFE_INTEGER);
    expect(getRolePriority(undefined)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("sortPlatformRoles", () => {
  it("orders by catalog seniority then name, unknowns last", () => {
    const sorted = sortPlatformRoles([
      { key: "GOVERNMENT_VIEWER", name: "Government Viewer" },
      { key: "MYSTERY_B", name: "Beta" },
      { key: "PLATFORM_ADMIN", name: "Bullyproof Admin" },
      { key: "MYSTERY_A", name: "Alpha" },
      { key: "INTRADARK_DEV", name: "Intradark Dev" },
    ]);
    expect(sorted.map((r) => r.key)).toEqual([
      "INTRADARK_DEV",
      "PLATFORM_ADMIN",
      "GOVERNMENT_VIEWER",
      "MYSTERY_A",
      "MYSTERY_B",
    ]);
  });

  it("does not mutate its input", () => {
    const input = [
      { key: "PLATFORM_STAFF", name: "Staff" },
      { key: "INTRADARK_DEV", name: "Dev" },
    ];
    const snapshot = [...input];
    sortPlatformRoles(input);
    expect(input).toEqual(snapshot);
  });
});
