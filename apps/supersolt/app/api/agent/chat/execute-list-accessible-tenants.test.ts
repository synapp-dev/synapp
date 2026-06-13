import { describe, expect, it, vi, beforeEach } from "vitest";

import { loadAgentAccessContext } from "@/server/agent/agent-tool-scope";

import { executeListAccessibleTenants } from "./execute-list-accessible-tenants";

vi.mock("@/server/agent/agent-tool-scope", () => ({
  loadAgentAccessContext: vi.fn(),
}));

const loadAccess = vi.mocked(loadAgentAccessContext);

describe("executeListAccessibleTenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to loadAgentAccessContext", async () => {
    loadAccess.mockResolvedValue({
      organisations: [
        {
          id: "org-1",
          name: "Acme",
          slug: "acme",
          logoUrl: null,
          roleSlug: "owner",
          roleDisplayName: "Owner",
          grantsOrgAdmin: true,
          venues: [],
        },
      ],
    });

    const result = await executeListAccessibleTenants({
      appDb: {} as never,
      userId: "user-1",
      requestId: "req-1",
    });

    expect(loadAccess).toHaveBeenCalledWith({
      appDb: {},
      userId: "user-1",
      requestId: "req-1",
    });
    expect(result.organisations).toHaveLength(1);
  });
});
