import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

import type { RequestAuthContext } from "@/server/auth/context";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { dashboardDigestService } from "@/server/dashboard/dashboard-digest.service";

import { POST } from "./route";

vi.mock("@/lib/api/route-auth", () => ({
  requireRequestAuth: vi.fn(),
}));

vi.mock("@/server/dashboard/dashboard-digest.service", () => ({
  dashboardDigestService: {
    streamDigest: vi.fn(),
  },
}));

const requireAuth = vi.mocked(requireRequestAuth);
const streamDigest = vi.mocked(dashboardDigestService.streamDigest);

function createMockCtx(): RequestAuthContext {
  return {
    userId: "user-1",
    appDb: {
      rls: async (fn) => fn({} as never),
      admin: {} as never,
    },
    tenantRoles: { organisations: [] },
  };
}

function unauthorizedResponse() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", status: 401 } },
    { status: 401 },
  );
}

function routeContext() {
  return {
    params: Promise.resolve({ organisation: "acme", venue: "richmond" }),
  };
}

const url =
  "http://localhost/api/organisations/acme/venues/richmond/dashboard/digest";

function postRequest(body?: unknown) {
  return new Request(url, {
    method: "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("dashboard digest route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ ctx: createMockCtx(), errorResponse: null });
  });

  it("returns the auth error response untouched when unauthenticated", async () => {
    const errorResponse = unauthorizedResponse();
    requireAuth.mockResolvedValue({ ctx: null, errorResponse });

    const res = await POST(postRequest(), routeContext());

    expect(res).toBe(errorResponse);
    expect(streamDigest).not.toHaveBeenCalled();
  });

  it("returns the streamed response from the service untouched", async () => {
    const streamed = new Response("digest-stream");
    streamDigest.mockResolvedValue(streamed as never);

    const res = await POST(postRequest({ force: false }), routeContext());

    expect(res).toBe(streamed);
    expect(streamDigest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
      {
        organisationSlug: "acme",
        venueSlug: "richmond",
        force: false,
      },
    );
  });

  it("passes force=true when the body requests a refresh", async () => {
    streamDigest.mockResolvedValue(new Response("digest-stream") as never);

    await POST(postRequest({ force: true }), routeContext());

    expect(streamDigest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ force: true }),
    );
  });

  it("defaults force to false when the body is missing or invalid", async () => {
    streamDigest.mockResolvedValue(new Response("digest-stream") as never);

    await POST(postRequest(), routeContext());

    expect(streamDigest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ force: false }),
    );
  });

  it("maps service errors to the error envelope", async () => {
    streamDigest.mockRejectedValue(
      Object.assign(new Error("Venue not found"), { status: 404 }),
    );

    const res = await POST(postRequest({ force: true }), routeContext());

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      data: null,
      error: { message: "Venue not found", status: 404 },
    });
  });
});
