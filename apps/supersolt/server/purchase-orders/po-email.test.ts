import { describe, expect, it } from "vitest";

import {
  buildPoEmailBody,
  formatPoEmailLine,
  type PoEmailPayload,
} from "./po-email.service";
import type { PoLineRow, PoRow } from "./purchase-orders.repo";

function line(partial: Partial<PoLineRow>): PoLineRow {
  return {
    id: "line-1",
    po_id: "po-1",
    supplier_product_id: "sp-1",
    ingredient_id: "ing-1",
    product_name: "Fior Di Latte",
    quantity_ordered: 12,
    quantity_received: 0,
    unit_price_cents: 1650,
    subtotal_cents: 19800,
    notes: null,
    is_outstanding: false,
    outstanding_resolution: null,
    expected_delivery_date: null,
    sort_order: 0,
    sku_code: null,
    pack_label: null,
    units_per_pack: null,
    pack_unit: null,
    ...partial,
  };
}

describe("formatPoEmailLine", () => {
  it("writes the full supplier-catalog form with SKU and pack contents", () => {
    expect(
      formatPoEmailLine(
        line({
          sku_code: "FDL-1KG",
          pack_label: "box",
          units_per_pack: 1,
          pack_unit: "kg",
        }),
      ),
    ).toBe(
      "• [FDL-1KG] Fior Di Latte — 12 box (1 kg per box) @ $16.50 per box",
    );
  });

  it("omits the SKU bracket when no code exists", () => {
    expect(
      formatPoEmailLine(line({ pack_label: "carton", units_per_pack: 12, pack_unit: "L" })),
    ).toBe("• Fior Di Latte — 12 carton (12 L per carton) @ $16.50 per carton");
  });

  it("skips redundant pack contents for single-each packs", () => {
    expect(
      formatPoEmailLine(line({ pack_label: "each", units_per_pack: 1, pack_unit: "each" })),
    ).toBe("• Fior Di Latte — 12 each @ $16.50 per each");
  });

  it("degrades to generic units for legacy lines with no snapshot", () => {
    expect(formatPoEmailLine(line({}))).toBe(
      "• Fior Di Latte — 12 unit @ $16.50 per unit",
    );
  });
});

function payload(partial: Partial<PoEmailPayload> = {}): PoEmailPayload {
  const po = {
    id: "po-1",
    organisation_id: "org-1",
    venue_id: "venue-1",
    supplier_id: "sup-1",
    po_number: "PO-2026-0007",
    status: "draft",
    expected_delivery_date: null,
    actual_delivery_date: null,
    subtotal_cents: 19800,
    gst_cents: 1980,
    total_cents: 21780,
    gst_treatment: "exclusive",
    notes: null,
    partial_delivery_flag: false,
    created_by_user_id: null,
    created_at: "2026-07-12T00:00:00Z",
    updated_at: "2026-07-12T00:00:00Z",
    submitted_at: null,
    confirmed_at: null,
    delivered_at: null,
    closed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    approval_status: null,
    approved_by_user_id: null,
    approval_comment: null,
    rejected_at: null,
    linked_invoice_id: null,
  } satisfies PoRow;
  return {
    po,
    lines: [line({})],
    venueName: "Supersolt Hawthorn",
    organisationName: "Solt Group",
    supplierName: "Fior Foods",
    orderingEmail: "orders@fiorfoods.com.au",
    fromAddress: "hawthorn@inbox.supersolt.com",
    ...partial,
  };
}

describe("buildPoEmailBody", () => {
  it("uses the default body when no template is set", () => {
    const body = buildPoEmailBody(payload());
    expect(body).toContain("Hello Fior Foods,");
    expect(body).toContain("PO-2026-0007");
    expect(body).toContain("Total (ex GST): $198.00");
    expect(body).toContain("Total (inc GST): $217.80");
  });

  it("renders org template placeholders", () => {
    const body = buildPoEmailBody(
      payload({
        bodyTemplate:
          "G'day {{supplier_name}},\n{{lines}}\nTotal {{total_inc_gst}} - {{venue_name}}",
      }),
    );
    expect(body).toBe(
      "G'day Fior Foods,\n• Fior Di Latte — 12 unit @ $16.50 per unit\nTotal $217.80 - Supersolt Hawthorn",
    );
  });

  it("leaves unknown placeholders untouched and blanks empty notes", () => {
    const body = buildPoEmailBody(
      payload({ bodyTemplate: "{{mystery}} notes:[{{notes}}]" }),
    );
    expect(body).toBe("{{mystery}} notes:[]");
  });
});
