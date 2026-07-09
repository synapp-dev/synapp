import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/drizzle", () => ({
  // transaction just runs the callback with a stub executor
  db: { transaction: vi.fn((cb: any) => cb({})) },
}));

vi.mock("@/server/features/features.service", () => ({
  assertFeature: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./content-types.repo", () => ({
  contentTypesRepo: {
    list: vi.fn(),
    getById: vi.fn(),
    getDefault: vi.fn(),
    getDefaultId: vi.fn(),
    findByNameInsensitive: vi.fn(),
    insertWithLevels: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countSchoolsUsing: vi.fn(),
    hasTopics: vi.fn(),
    listStages: vi.fn(),
    stageHasTopics: vi.fn(),
    renameStage: vi.fn(),
    deleteStages: vi.fn(),
    appendStages: vi.fn(),
    duplicateFromSource: vi.fn(),
  },
}));

import {
  ContentTypeError,
  contentTypesService,
} from "./content-types.service";
import { contentTypesRepo } from "./content-types.repo";
import { assertFeature } from "@/server/features/features.service";

const repo = contentTypesRepo as unknown as Record<string, ReturnType<typeof vi.fn>>;
const ctx = { userId: "admin-1" };
const SRC_ID = "11111111-1111-4111-8111-111111111111";
const GHOST_ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  (assertFeature as any).mockResolvedValue(undefined);
});

describe("create", () => {
  it("materialises one stage per level via a transaction", async () => {
    repo.findByNameInsensitive.mockResolvedValue(null);
    repo.insertWithLevels.mockResolvedValue({ id: "ct-1", name: "Thursday Island" });

    const body = {
      name: "Thursday Island",
      levelCount: 3,
      levelNames: ["Level 1", "Level 2", "Level 3"],
    };
    const result = await contentTypesService.create(ctx, body);

    expect(assertFeature).toHaveBeenCalledWith(ctx, "/admin/content");
    expect(repo.insertWithLevels).toHaveBeenCalledWith(expect.anything(), {
      name: "Thursday Island",
      levelNames: ["Level 1", "Level 2", "Level 3"],
    });
    expect(result).toEqual({ id: "ct-1", name: "Thursday Island" });
  });

  it("rejects a case-insensitive duplicate name", async () => {
    repo.findByNameInsensitive.mockResolvedValue({ id: "existing" });

    await expect(
      contentTypesService.create(ctx, {
        name: "default",
        levelCount: 1,
        levelNames: ["Level 1"],
      }),
    ).rejects.toMatchObject({ code: "duplicate_name" });
    expect(repo.insertWithLevels).not.toHaveBeenCalled();
  });

  it("deep-copies when a source type is given", async () => {
    repo.findByNameInsensitive.mockResolvedValue(null);
    repo.getById
      .mockResolvedValueOnce({ id: SRC_ID, isDefault: true }) // source lookup
      .mockResolvedValueOnce({ id: "ct-new", name: "Copy" }); // final fetch
    repo.duplicateFromSource.mockResolvedValue({ id: "ct-new" });

    const result = await contentTypesService.create(ctx, {
      name: "Copy",
      levelCount: 1,
      levelNames: ["Level 1"],
      sourceContentTypeId: SRC_ID,
    });

    expect(repo.duplicateFromSource).toHaveBeenCalledWith("Copy", SRC_ID);
    expect(repo.insertWithLevels).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "ct-new", name: "Copy" });
  });

  it("404s when the source type is unknown", async () => {
    repo.findByNameInsensitive.mockResolvedValue(null);
    repo.getById.mockResolvedValue(null);

    await expect(
      contentTypesService.create(ctx, {
        name: "Copy",
        levelCount: 1,
        levelNames: ["Level 1"],
        sourceContentTypeId: GHOST_ID,
      }),
    ).rejects.toMatchObject({ code: "source_not_found" });
  });
});

describe("delete", () => {
  it("refuses to delete the Default type", async () => {
    repo.getById.mockResolvedValue({ id: "ct-default", isDefault: true });

    await expect(contentTypesService.delete(ctx, "ct-default")).rejects.toMatchObject(
      { code: "default_protected" },
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when schools reference the type", async () => {
    repo.getById.mockResolvedValue({ id: "ct-1", isDefault: false });
    repo.countSchoolsUsing.mockResolvedValue(2);

    await expect(contentTypesService.delete(ctx, "ct-1")).rejects.toMatchObject({
      code: "in_use",
    });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when the type has authored topics", async () => {
    repo.getById.mockResolvedValue({ id: "ct-1", isDefault: false });
    repo.countSchoolsUsing.mockResolvedValue(0);
    repo.hasTopics.mockResolvedValue(true);

    await expect(contentTypesService.delete(ctx, "ct-1")).rejects.toMatchObject({
      code: "in_use",
    });
  });

  it("deletes a clean, non-default type", async () => {
    repo.getById.mockResolvedValue({ id: "ct-1", isDefault: false });
    repo.countSchoolsUsing.mockResolvedValue(0);
    repo.hasTopics.mockResolvedValue(false);

    const result = await contentTypesService.delete(ctx, "ct-1");
    expect(repo.delete).toHaveBeenCalledWith("ct-1");
    expect(result).toEqual({ id: "ct-1" });
  });
});

describe("update / syncLevels", () => {
  it("renames stages in place when level names change", async () => {
    repo.getById.mockResolvedValue({ id: "ct-1", isDefault: false });
    repo.findByNameInsensitive.mockResolvedValue(null);
    repo.listStages.mockResolvedValue([
      { id: "s1", name: "Level 1" },
      { id: "s2", name: "Level 2" },
    ]);
    repo.update.mockResolvedValue({ id: "ct-1" });

    await contentTypesService.update(ctx, "ct-1", {
      levelCount: 2,
      levelNames: ["Level 1", "Junior"],
    });

    expect(repo.renameStage).toHaveBeenCalledWith("s2", "Junior");
    expect(repo.renameStage).not.toHaveBeenCalledWith("s1", "Level 1");
    expect(repo.deleteStages).not.toHaveBeenCalled();
  });

  it("appends new stages when levels grow", async () => {
    repo.getById.mockResolvedValue({ id: "ct-1", isDefault: false });
    repo.listStages.mockResolvedValue([{ id: "s1", name: "Level 1" }]);
    repo.update.mockResolvedValue({ id: "ct-1" });

    await contentTypesService.update(ctx, "ct-1", {
      levelCount: 2,
      levelNames: ["Level 1", "Level 2"],
    });

    expect(repo.appendStages).toHaveBeenCalledWith("ct-1", 1, ["Level 2"]);
  });

  it("blocks removing a level that still has topics", async () => {
    repo.getById.mockResolvedValue({ id: "ct-1", isDefault: false });
    repo.listStages.mockResolvedValue([
      { id: "s1", name: "Level 1" },
      { id: "s2", name: "Level 2" },
    ]);
    repo.stageHasTopics.mockResolvedValue(true);

    await expect(
      contentTypesService.update(ctx, "ct-1", {
        levelCount: 1,
        levelNames: ["Level 1"],
      }),
    ).rejects.toMatchObject({ code: "level_in_use" });
    expect(repo.deleteStages).not.toHaveBeenCalled();
  });

  it("removes an empty trailing level", async () => {
    repo.getById.mockResolvedValue({ id: "ct-1", isDefault: false });
    repo.listStages.mockResolvedValue([
      { id: "s1", name: "Level 1" },
      { id: "s2", name: "Level 2" },
    ]);
    repo.stageHasTopics.mockResolvedValue(false);
    repo.update.mockResolvedValue({ id: "ct-1" });

    await contentTypesService.update(ctx, "ct-1", {
      levelCount: 1,
      levelNames: ["Level 1"],
    });

    expect(repo.deleteStages).toHaveBeenCalledWith(["s2"]);
  });
});

describe("ContentTypeError", () => {
  it("carries a stable code", () => {
    const err = new ContentTypeError("in_use", "nope");
    expect(err.code).toBe("in_use");
    expect(err.message).toBe("nope");
  });
});
