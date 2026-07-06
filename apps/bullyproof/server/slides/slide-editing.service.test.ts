import { describe, expect, it, vi } from "vitest";
import {
  applySlideReorder,
  applySlideReorderOrNormalize,
} from "./slide-editing.service";

describe("applySlideReorder", () => {
  it("rejects slides that do not belong to the topic", async () => {
    const deps = {
      getValidSlideIds: vi.fn().mockResolvedValue(new Set(["a"])),
      applyOrder: vi.fn(),
      normalizeOrder: vi.fn(),
    };

    const result = await applySlideReorder("topic-1", ["a", "foreign"], deps);

    expect(result).toEqual({ ok: false, invalidSlideIds: ["foreign"] });
    expect(deps.applyOrder).not.toHaveBeenCalled();
  });

  it("applies order when all slides are valid", async () => {
    const deps = {
      getValidSlideIds: vi.fn().mockResolvedValue(new Set(["a", "b"])),
      applyOrder: vi.fn().mockResolvedValue(undefined),
      normalizeOrder: vi.fn(),
    };

    const result = await applySlideReorder("topic-1", ["a", "b"], deps);

    expect(result).toEqual({ ok: true });
    expect(deps.applyOrder).toHaveBeenCalledWith("topic-1", ["a", "b"]);
  });
});

describe("applySlideReorderOrNormalize", () => {
  it("normalizes when no final order provided", async () => {
    const deps = {
      getValidSlideIds: vi.fn(),
      applyOrder: vi.fn(),
      normalizeOrder: vi.fn().mockResolvedValue(undefined),
    };

    const result = await applySlideReorderOrNormalize("topic-1", null, deps);

    expect(result).toEqual({ ok: true });
    expect(deps.normalizeOrder).toHaveBeenCalledWith("topic-1");
  });
});
