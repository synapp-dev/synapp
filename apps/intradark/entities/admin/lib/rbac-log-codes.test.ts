import { describe, expect, it } from "vitest";

import { RBAC_ROLE_QUERY_FAILED } from "./rbac-log-codes";

describe("rbac-log-codes", () => {
  it("exports stable query failure code", () => {
    expect(RBAC_ROLE_QUERY_FAILED).toBe("RBAC_ROLE_QUERY_FAILED");
  });
});
