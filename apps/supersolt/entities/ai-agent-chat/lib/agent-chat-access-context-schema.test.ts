import { describe, expect, it } from "vitest";

import {
  agentChatAccessContextSchema,
  focusPairExistsInAccessContext,
  parseOptionalAgentChatAccessContext,
} from "./agent-chat-access-context-schema";

const validOrg = {
  id: "a0000000-0000-4000-8000-000000000001",
  name: "Acme",
  slug: "acme",
  logoUrl: null,
  roleSlug: "member",
  roleDisplayName: "Member",
  grantsOrgAdmin: false,
  venues: [
    {
      id: "a0000000-0000-4000-8000-000000000002",
      name: "Richmond",
      slug: "richmond",
      suburb: "Richmond",
      state: "VIC",
      venueType: "restaurant",
      roleSlug: "member",
      roleDisplayName: "Member",
      grantsOrgAdmin: false,
    },
  ],
};

describe("agent-chat-access-context-schema", () => {
  it("accepts a minimal valid accessContext", () => {
    const parsed = agentChatAccessContextSchema.safeParse({
      organisations: [validOrg],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid organisation slug", () => {
    const parsed = agentChatAccessContextSchema.safeParse({
      organisations: [{ ...validOrg, slug: "Acme_Bad" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("parseOptional returns false for invalid snapshot", () => {
    expect(
      parseOptionalAgentChatAccessContext({
        organisations: [{ ...validOrg, slug: "Bad_Slug" }],
      }).ok
    ).toBe(false);
  });

  it("focusPairExistsInAccessContext matches nested venue", () => {
    const ctx = agentChatAccessContextSchema.parse({
      organisations: [validOrg],
    });
    expect(focusPairExistsInAccessContext(ctx, "acme", "richmond")).toBe(true);
    expect(focusPairExistsInAccessContext(ctx, "acme", "nope")).toBe(false);
  });
});
