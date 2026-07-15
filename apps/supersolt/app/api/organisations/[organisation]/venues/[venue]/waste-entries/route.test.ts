import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

import type { RequestAuthContext } from "@/server/auth/context";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { wasteService } from "@/server/consumption/waste.service";

import { GET, POST } from "./route";

vi.mock("@/lib/api/route-auth", () => ({
  requireRequestAuth: vi.fn(),
}));

vi.mock("@/server/consumption/waste.service", () => ({
  wasteService: {
    list: vi.fn(),
    create: vi.fn(),
    createBulk: vi.fn(),
  },
}));

const requireAuth = vi.mocked(requireRequestAuth);
const listWaste = vi.mocked(wasteService.list);
const createWaste = vi.mocked(wasteService.create);
const createBulkWaste = vi.mocked(wasteService.createBulk);

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

const baseUrl =
  "http://localhost/api/organisations/acme/venues/richmond/waste-entries";

describe("waste-entries route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ ctx: createMockCtx(), errorResponse: null });
  });

  describe("GET", () => {
    it("returns the auth error response untouched when unauthenticated", async () => {
      const errorResponse = unauthorizedResponse();
      requireAuth.mockResolvedValue({ ctx: null, errorResponse });

      const res = await GET(new Request(baseUrl), routeContext());

      expect(res).toBe(errorResponse);
      expect(listWaste).not.toHaveBeenCalled();
    });

    it("lists waste entries with explicit from/to window", async () => {
      listWaste.mockResolvedValue([{ id: "we-1" }] as never);

      const res = await GET(
        new Request(
          `${baseUrl}?from=2026-06-01T00:00:00.000Z&to=2026-07-01T00:00:00.000Z`,
        ),
        routeContext(),
      );

      expect(listWaste).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }), {
        organisationSlug: "acme",
        venueSlug: "richmond",
        fromIso: "2026-06-01T00:00:00.000Z",
        toIso: "2026-07-01T00:00:00.000Z",
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [{ id: "we-1" }], error: null });
    });

    it("defaults to a trailing 30-day window when from/to are omitted", async () => {
      listWaste.mockResolvedValue([] as never);

      await GET(new Request(baseUrl), routeContext());

      const args = listWaste.mock.calls[0]![1];
      const from = new Date(args.fromIso).getTime();
      const to = new Date(args.toIso).getTime();
      expect(to - from).toBeCloseTo(30 * 86_400_000, -4);
    });

    it("maps service errors to the error envelope", async () => {
      listWaste.mockRejectedValue(
        Object.assign(new Error("Venue not found"), {
          status: 404,
          code: "waste.venue_not_found",
        }),
      );

      const res = await GET(new Request(baseUrl), routeContext());

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        data: null,
        error: {
          message: "Venue not found",
          status: 404,
          code: "waste.venue_not_found",
        },
      });
    });
  });

  describe("POST", () => {
    it("returns the auth error response untouched when unauthenticated", async () => {
      const errorResponse = unauthorizedResponse();
      requireAuth.mockResolvedValue({ ctx: null, errorResponse });

      const res = await POST(
        new Request(baseUrl, { method: "POST", body: JSON.stringify({}) }),
        routeContext(),
      );

      expect(res).toBe(errorResponse);
      expect(createWaste).not.toHaveBeenCalled();
      expect(createBulkWaste).not.toHaveBeenCalled();
    });

    it("creates a single entry when body is a plain input", async () => {
      createWaste.mockResolvedValue({ id: "we-1" } as never);
      const input = { ingredientId: "ing-1", qty: 2, unit: "kg", reason: "spoilage" };

      const res = await POST(
        new Request(baseUrl, { method: "POST", body: JSON.stringify(input) }),
        routeContext(),
      );

      expect(createWaste).toHaveBeenCalledWith(expect.anything(), {
        organisationSlug: "acme",
        venueSlug: "richmond",
        input,
      });
      expect(createBulkWaste).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id: "we-1" }, error: null });
    });

    it("creates bulk entries when body has an entries array", async () => {
      createBulkWaste.mockResolvedValue([{ id: "we-1" }, { id: "we-2" }] as never);
      const entries = [
        { ingredientId: "ing-1", qty: 2, unit: "kg", reason: "spoilage" },
        { ingredientId: "ing-2", qty: 1, unit: "each", reason: "prep_waste" },
      ];

      const res = await POST(
        new Request(baseUrl, { method: "POST", body: JSON.stringify({ entries }) }),
        routeContext(),
      );

      expect(createBulkWaste).toHaveBeenCalledWith(expect.anything(), {
        organisationSlug: "acme",
        venueSlug: "richmond",
        entries,
      });
      expect(createWaste).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [{ id: "we-1" }, { id: "we-2" }],
        error: null,
      });
    });

    it("returns 500 with the default code for unexpected errors", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      createWaste.mockRejectedValue(new Error("boom"));

      const res = await POST(
        new Request(baseUrl, {
          method: "POST",
          body: JSON.stringify({ ingredientId: "ing-1" }),
        }),
        routeContext(),
      );

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        data: null,
        error: {
          message: "Internal server error",
          status: 500,
          code: "waste.failed",
        },
      });
    });
  });
});
