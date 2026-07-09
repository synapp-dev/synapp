import { describe, expect, it } from "vitest";
import {
  createContentTypeSchema,
  updateContentTypeSchema,
} from "./content-types.validators";

describe("createContentTypeSchema", () => {
  it("accepts a matching level count and names", () => {
    const parsed = createContentTypeSchema.parse({
      name: "Thursday Island",
      levelCount: 3,
      levelNames: ["Level 1", "Level 2", "Level 3"],
    });
    expect(parsed.levelNames).toHaveLength(3);
  });

  it("rejects when level count does not match the number of names", () => {
    const result = createContentTypeSchema.safeParse({
      name: "Mismatch",
      levelCount: 2,
      levelNames: ["Only one"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = createContentTypeSchema.safeParse({
      name: "   ",
      levelCount: 1,
      levelNames: ["Level 1"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty level name", () => {
    const result = createContentTypeSchema.safeParse({
      name: "Has blank level",
      levelCount: 2,
      levelNames: ["Level 1", ""],
    });
    expect(result.success).toBe(false);
  });

  it("trims the name and level names", () => {
    const parsed = createContentTypeSchema.parse({
      name: "  Padded  ",
      levelCount: 1,
      levelNames: ["  Level 1  "],
    });
    expect(parsed.name).toBe("Padded");
    expect(parsed.levelNames[0]).toBe("Level 1");
  });

  it("accepts an optional sourceContentTypeId (uuid)", () => {
    const parsed = createContentTypeSchema.parse({
      name: "Cloned",
      levelCount: 1,
      levelNames: ["Level 1"],
      sourceContentTypeId: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed.sourceContentTypeId).toBeDefined();
  });
});

describe("updateContentTypeSchema", () => {
  it("accepts a rename with no level change", () => {
    const parsed = updateContentTypeSchema.parse({ name: "Renamed" });
    expect(parsed.name).toBe("Renamed");
  });

  it("rejects an empty update", () => {
    const result = updateContentTypeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a level count that disagrees with the names", () => {
    const result = updateContentTypeSchema.safeParse({
      levelCount: 3,
      levelNames: ["Level 1", "Level 2"],
    });
    expect(result.success).toBe(false);
  });
});
