import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSchoolId, resolveSchoolRef } from "./resolve-school-ref";

vi.mock("./school.repo", () => ({
  schoolRepo: {
    getBySlug: vi.fn(),
    getByIds: vi.fn(),
  },
}));

import { schoolRepo } from "./school.repo";

const mockedGetBySlug = vi.mocked(schoolRepo.getBySlug);
const mockedGetByIds = vi.mocked(schoolRepo.getByIds);

describe("resolveSchoolRef", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for empty input", async () => {
    await expect(resolveSchoolRef("")).resolves.toBeNull();
    await expect(resolveSchoolRef("   ")).resolves.toBeNull();
  });

  it("resolves slug to id and slug", async () => {
    mockedGetBySlug.mockResolvedValue([
      {
        id: "11111111-1111-1111-1111-111111111111",
        slug: "acme-high",
      },
    ] as Awaited<ReturnType<typeof schoolRepo.getBySlug>>);

    await expect(resolveSchoolRef("acme-high")).resolves.toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      slug: "acme-high",
    });
    expect(mockedGetBySlug).toHaveBeenCalledWith("acme-high");
    expect(mockedGetByIds).not.toHaveBeenCalled();
  });

  it("returns null when slug is unknown", async () => {
    mockedGetBySlug.mockResolvedValue([]);

    await expect(resolveSchoolRef("missing-school")).resolves.toBeNull();
  });

  it("resolves UUID to id and slug", async () => {
    mockedGetByIds.mockResolvedValue([
      {
        id: "22222222-2222-2222-2222-222222222222",
        slug: "riverdale",
      },
    ] as Awaited<ReturnType<typeof schoolRepo.getByIds>>);

    await expect(
      resolveSchoolRef("22222222-2222-2222-2222-222222222222")
    ).resolves.toEqual({
      id: "22222222-2222-2222-2222-222222222222",
      slug: "riverdale",
    });
    expect(mockedGetByIds).toHaveBeenCalledWith([
      "22222222-2222-2222-2222-222222222222",
    ]);
    expect(mockedGetBySlug).not.toHaveBeenCalled();
  });

  it("returns null when UUID does not match a school", async () => {
    mockedGetByIds.mockResolvedValue([]);

    await expect(
      resolveSchoolRef("33333333-3333-3333-3333-333333333333")
    ).resolves.toBeNull();
  });

  it("treats non-uuid strings as slugs", async () => {
    mockedGetBySlug.mockResolvedValue([
      {
        id: "44444444-4444-4444-4444-444444444444",
        slug: "not-a-uuid",
      },
    ] as Awaited<ReturnType<typeof schoolRepo.getBySlug>>);

    await expect(resolveSchoolRef("not-a-uuid")).resolves.toEqual({
      id: "44444444-4444-4444-4444-444444444444",
      slug: "not-a-uuid",
    });
  });
});

describe("resolveSchoolId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the school id", async () => {
    mockedGetBySlug.mockResolvedValue([
      {
        id: "55555555-5555-5555-5555-555555555555",
        slug: "east-side",
      },
    ] as Awaited<ReturnType<typeof schoolRepo.getBySlug>>);

    await expect(resolveSchoolId("east-side")).resolves.toBe(
      "55555555-5555-5555-5555-555555555555"
    );
  });
});
