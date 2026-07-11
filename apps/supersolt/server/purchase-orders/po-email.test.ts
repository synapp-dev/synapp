import { describe, expect, it } from "vitest";

import { formatPoEmailLine } from "./po-email.service";
import type { PoLineRow } from "./purchase-orders.repo";

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
