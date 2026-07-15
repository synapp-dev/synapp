import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

import type { RequestAuthContext } from "@/server/auth/context";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  getVenueInvoiceDetail,
  parseInvoiceAttachmentIfNeeded,
} from "@/server/invoices/invoices.service";

import { POST } from "./route";

vi.mock("@/lib/api/route-auth", () => ({
  requireRequestAuth: vi.fn(),
}));

vi.mock("@/server/invoices/invoices.service", () => ({
  parseInvoiceAttachmentIfNeeded: vi.fn(),
  getVenueInvoiceDetail: vi.fn(),
}));

const requireAuth = vi.mocked(requireRequestAuth);
const parseAttachment = vi.mocked(parseInvoiceAttachmentIfNeeded);
const getDetail = vi.mocked(getVenueInvoiceDetail);

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
    params: Promise.resolve({
      organisation: "acme",
      venue: "richmond",
      invoiceId: "inv-1",
    }),
  };
}

const url =
  "http://localhost/api/organisations/acme/venues/richmond/invoices/inv-1/parse-attachment";

function postRequest(body?: unknown) {
  return new Request(url, {
    method: "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const invoiceScope = {
  organisationSlug: "acme",
  venueSlug: "richmond",
  invoiceId: "inv-1",
};

describe("invoice parse-attachment route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ ctx: createMockCtx(), errorResponse: null });
  });

  it("returns the auth error response untouched when unauthenticated", async () => {
    const errorResponse = unauthorizedResponse();
    requireAuth.mockResolvedValue({ ctx: null, errorResponse });

    const res = await POST(postRequest(), routeContext());

    expect(res).toBe(errorResponse);
    expect(parseAttachment).not.toHaveBeenCalled();
    expect(getDetail).not.toHaveBeenCalled();
  });

  it("parses the attachment and merges the refreshed invoice detail", async () => {
    parseAttachment.mockResolvedValue({ parsed: true, lineCount: 12 } as never);
    getDetail.mockResolvedValue({ id: "inv-1", status: "pending_review" } as never);

    const res = await POST(postRequest({}), routeContext());

    expect(parseAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
      { ...invoiceScope, force: false },
    );
    expect(getDetail).toHaveBeenCalledWith(expect.anything(), invoiceScope);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: {
        parsed: true,
        lineCount: 12,
        detail: { id: "inv-1", status: "pending_review" },
      },
      error: null,
    });
  });

  it("passes force=true when the body requests a re-parse", async () => {
    parseAttachment.mockResolvedValue({ parsed: true } as never);
    getDetail.mockResolvedValue({ id: "inv-1" } as never);

    await POST(postRequest({ force: true }), routeContext());

    expect(parseAttachment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ force: true }),
    );
  });

  it("defaults force to false when the request has no body", async () => {
    parseAttachment.mockResolvedValue({ parsed: false } as never);
    getDetail.mockResolvedValue({ id: "inv-1" } as never);

    await POST(postRequest(), routeContext());

    expect(parseAttachment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ force: false }),
    );
  });

  it("maps parse failures to the error envelope", async () => {
    parseAttachment.mockRejectedValue(
      Object.assign(new Error("No attachment to parse"), {
        status: 422,
        code: "invoices.no_attachment",
      }),
    );

    const res = await POST(postRequest({}), routeContext());

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      data: null,
      error: {
        message: "No attachment to parse",
        status: 422,
        code: "invoices.no_attachment",
      },
    });
    expect(getDetail).not.toHaveBeenCalled();
  });
});
