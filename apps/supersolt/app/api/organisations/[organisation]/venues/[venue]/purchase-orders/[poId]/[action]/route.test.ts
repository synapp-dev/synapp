import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

import type { RequestAuthContext } from "@/server/auth/context";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { purchaseOrdersService } from "@/server/purchase-orders/purchase-orders.service";

import { POST } from "./route";

vi.mock("@/lib/api/route-auth", () => ({
  requireRequestAuth: vi.fn(),
}));

vi.mock("@/server/purchase-orders/purchase-orders.service", () => ({
  purchaseOrdersService: {
    send: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    confirm: vi.fn(),
    receive: vi.fn(),
    close: vi.fn(),
    cancel: vi.fn(),
  },
}));

const requireAuth = vi.mocked(requireRequestAuth);
const poService = vi.mocked(purchaseOrdersService);

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

function routeContext(action: string) {
  return {
    params: Promise.resolve({
      organisation: "acme",
      venue: "richmond",
      poId: "po-1",
      action,
    }),
  };
}

function postRequest(action: string, body?: unknown) {
  return new Request(
    `http://localhost/api/organisations/acme/venues/richmond/purchase-orders/po-1/${action}`,
    {
      method: "POST",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
}

const baseScope = {
  organisationSlug: "acme",
  venueSlug: "richmond",
  poId: "po-1",
};

describe("purchase-orders [action] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ ctx: createMockCtx(), errorResponse: null });
  });

  it("returns the auth error response untouched when unauthenticated", async () => {
    const errorResponse = unauthorizedResponse();
    requireAuth.mockResolvedValue({ ctx: null, errorResponse });

    const res = await POST(postRequest("send"), routeContext("send"));

    expect(res).toBe(errorResponse);
    expect(poService.send).not.toHaveBeenCalled();
  });

  it("sends the PO even when the request has no body", async () => {
    poService.send.mockResolvedValue({ id: "po-1", status: "sent" } as never);

    const res = await POST(postRequest("send"), routeContext("send"));

    expect(poService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
      baseScope,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: { id: "po-1", status: "sent" },
      error: null,
    });
  });

  it("passes the approve comment through", async () => {
    poService.approve.mockResolvedValue({ id: "po-1", status: "approved" } as never);

    const res = await POST(
      postRequest("approve", { comment: "Looks good" }),
      routeContext("approve"),
    );

    expect(poService.approve).toHaveBeenCalledWith(expect.anything(), {
      ...baseScope,
      comment: "Looks good",
    });
    expect(res.status).toBe(200);
  });

  it("defaults the reject comment to 'Rejected' when body is empty", async () => {
    poService.reject.mockResolvedValue({ id: "po-1", status: "rejected" } as never);

    await POST(postRequest("reject", {}), routeContext("reject"));

    expect(poService.reject).toHaveBeenCalledWith(expect.anything(), {
      ...baseScope,
      comment: "Rejected",
    });
  });

  it("defaults the cancel reason to 'Cancelled' when body is missing", async () => {
    poService.cancel.mockResolvedValue({ id: "po-1", status: "cancelled" } as never);

    await POST(postRequest("cancel"), routeContext("cancel"));

    expect(poService.cancel).toHaveBeenCalledWith(expect.anything(), {
      ...baseScope,
      reason: "Cancelled",
    });
  });

  it("passes the receive body through as the receive input", async () => {
    poService.receive.mockResolvedValue({ id: "po-1", status: "received" } as never);
    const input = { lines: [{ poLineId: "line-1", receivedQty: 3 }] };

    await POST(postRequest("receive", input), routeContext("receive"));

    expect(poService.receive).toHaveBeenCalledWith(expect.anything(), {
      ...baseScope,
      input,
    });
  });

  it("returns 404 for an unknown action", async () => {
    const res = await POST(postRequest("explode"), routeContext("explode"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      data: null,
      error: { message: "Unknown action", status: 404 },
    });
    expect(poService.send).not.toHaveBeenCalled();
  });

  it("maps service errors to the error envelope", async () => {
    poService.send.mockRejectedValue(
      Object.assign(new Error("PO is not in a sendable state"), {
        status: 409,
        code: "purchase_orders.invalid_status",
      }),
    );

    const res = await POST(postRequest("send"), routeContext("send"));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      data: null,
      error: {
        message: "PO is not in a sendable state",
        status: 409,
        code: "purchase_orders.invalid_status",
      },
    });
  });
});
