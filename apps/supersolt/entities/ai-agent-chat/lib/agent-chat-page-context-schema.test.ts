import { describe, expect, it } from "vitest";

import {
  buildPageContextSystemAppend,
  parseAgentChatPageContextFromBody,
} from "./agent-chat-page-context-schema";

describe("parseAgentChatPageContextFromBody", () => {
  it("returns pathname and pageLabel when valid", () => {
    expect(
      parseAgentChatPageContextFromBody({
        pathname: "/acme/richmond/inventory",
        pageLabel: "Ingredients",
      }),
    ).toEqual({
      pathname: "/acme/richmond/inventory",
      pageLabel: "Ingredients",
    });
  });

  it("strips newlines and control chars", () => {
    expect(
      parseAgentChatPageContextFromBody({
        pathname: "/foo\n/bar",
        pageLabel: "A\u0000B",
      }),
    ).toEqual({
      pathname: "/foo /bar",
      pageLabel: "A B",
    });
  });

  it("drops pathname that does not start with /", () => {
    expect(
      parseAgentChatPageContextFromBody({
        pathname: "evil.example/path",
        pageLabel: "Ok",
      }),
    ).toEqual({ pageLabel: "Ok" });
  });

  it("drops wrong types and oversized strings", () => {
    expect(
      parseAgentChatPageContextFromBody({
        pathname: 123,
        pageLabel: "x".repeat(300),
      }),
    ).toEqual({});
  });

  it("drops empty strings after trim", () => {
    expect(
      parseAgentChatPageContextFromBody({
        pathname: "   ",
        pageLabel: "\n\t ",
      }),
    ).toEqual({});
  });
});

describe("buildPageContextSystemAppend", () => {
  it("returns null when nothing to say", () => {
    expect(buildPageContextSystemAppend({})).toBeNull();
  });

  it("includes both parts when present", () => {
    const s = buildPageContextSystemAppend({
      pathname: "/a/b",
      pageLabel: "Stock",
    });
    expect(s).toContain("/a/b");
    expect(s).toContain("Stock");
  });
});
