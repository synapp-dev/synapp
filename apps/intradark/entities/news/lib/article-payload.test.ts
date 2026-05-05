import { describe, expect, it } from "vitest";

import { MAX_BODY_JSON_BYTES, parseAndValidateBodyJson } from "./article-payload";

describe("parseAndValidateBodyJson", () => {
  it("accepts plain objects", () => {
    const doc = { type: "doc", content: [] };
    expect(parseAndValidateBodyJson(doc)).toEqual({ ok: true, value: doc });
  });

  it("parses valid JSON strings", () => {
    const raw = '{"type":"doc"}';
    expect(parseAndValidateBodyJson(raw)).toEqual({
      ok: true,
      value: { type: "doc" },
    });
  });

  it("rejects arrays", () => {
    expect(parseAndValidateBodyJson([1, 2])).toEqual({
      ok: false,
      code: "not_object",
    });
  });

  it("rejects non-object JSON", () => {
    expect(parseAndValidateBodyJson("null")).toEqual({
      ok: false,
      code: "not_object",
    });
  });

  it("rejects oversize string input", () => {
    const huge = "x".repeat(MAX_BODY_JSON_BYTES + 1);
    expect(parseAndValidateBodyJson(huge)).toEqual({
      ok: false,
      code: "oversize",
    });
  });
});
