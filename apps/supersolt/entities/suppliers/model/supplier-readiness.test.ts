import { describe, expect, it } from "vitest";
import {
  evaluateSupplierReadiness,
  type SupplierReadinessInput,
} from "./supplier-readiness";

const complete: SupplierReadinessInput = {
  name: "Morabito Fruit & Veg",
  abn: "12345678901",
  category: "produce",
  email: "morabitodomenic@gmail.com",
  contactPerson: "Domenic",
  phone: "0400000000",
  paymentTerms: "Net 14",
  hasDeliveryDay: true,
  unreviewedItemCount: 0,
};

describe("evaluateSupplierReadiness", () => {
  it("reports a fully set-up supplier as complete", () => {
    const r = evaluateSupplierReadiness(complete);
    expect(r.total).toBe(0);
    expect(r.complete).toBe(true);
    expect(r.outstanding).toEqual({
      information: 0,
      contact: 0,
      payment: 0,
      delivery: 0,
      items: 0,
    });
  });

  it("flags every blank contact field", () => {
    const r = evaluateSupplierReadiness({
      ...complete,
      email: "",
      contactPerson: "",
      phone: "",
    });
    expect(r.outstanding.contact).toBe(3);
    expect(r.complete).toBe(false);
  });

  it("treats an invalid email as outstanding", () => {
    const r = evaluateSupplierReadiness({ ...complete, email: "not-an-email" });
    expect(r.outstanding.contact).toBe(1);
  });

  it("treats category 'other' and a blank ABN as not-yet-classified", () => {
    const r = evaluateSupplierReadiness({
      ...complete,
      category: "other",
      abn: "  ",
    });
    expect(r.outstanding.information).toBe(2);
  });

  it("flags missing payment terms and no delivery day", () => {
    const r = evaluateSupplierReadiness({
      ...complete,
      paymentTerms: "",
      hasDeliveryDay: false,
    });
    expect(r.outstanding.payment).toBe(1);
    expect(r.outstanding.delivery).toBe(1);
  });

  it("counts unreviewed items in the items section", () => {
    const r = evaluateSupplierReadiness({ ...complete, unreviewedItemCount: 9 });
    expect(r.outstanding.items).toBe(9);
    expect(r.total).toBe(9);
  });

  it("flags an inventory supplier with no inventory items once triage is done", () => {
    const r = evaluateSupplierReadiness({
      ...complete,
      isInventorySource: true,
      inventoryItemCount: 0,
      unreviewedItemCount: 0,
    });
    expect(r.needsCatalog).toBe(true);
    expect(r.outstanding.items).toBe(1);
    expect(r.complete).toBe(false);
  });

  it("does not flag needsCatalog while items are still pending review", () => {
    const r = evaluateSupplierReadiness({
      ...complete,
      isInventorySource: true,
      inventoryItemCount: 0,
      unreviewedItemCount: 4,
    });
    expect(r.needsCatalog).toBe(false);
    // The pending items are the outstanding work, not a missing catalog.
    expect(r.outstanding.items).toBe(4);
  });

  it("clears needsCatalog once an inventory item exists", () => {
    const r = evaluateSupplierReadiness({
      ...complete,
      isInventorySource: true,
      inventoryItemCount: 2,
      unreviewedItemCount: 0,
    });
    expect(r.needsCatalog).toBe(false);
    expect(r.complete).toBe(true);
  });

  it("suppresses needsCatalog when parked as no-catalog", () => {
    const r = evaluateSupplierReadiness({
      ...complete,
      isInventorySource: true,
      inventoryItemCount: 0,
      unreviewedItemCount: 0,
      noCatalogAcked: true,
    });
    expect(r.needsCatalog).toBe(false);
    expect(r.complete).toBe(true);
  });

  it("never requires a catalog for a non-inventory supplier", () => {
    const r = evaluateSupplierReadiness({
      ...complete,
      isInventorySource: false,
      inventoryItemCount: 0,
      unreviewedItemCount: 0,
    });
    expect(r.needsCatalog).toBe(false);
  });

  it("lists the exact missing fields", () => {
    const r = evaluateSupplierReadiness({
      ...complete,
      contactPerson: "",
      paymentTerms: "",
    });
    expect(r.missing).toEqual(["contactPerson", "paymentTerms"]);
  });

  it("reports no missing fields when complete", () => {
    expect(evaluateSupplierReadiness(complete).missing).toEqual([]);
  });

  it("sums outstanding across sections", () => {
    const r = evaluateSupplierReadiness({
      name: "Bare Supplier",
      abn: "",
      category: "other",
      email: "",
      contactPerson: "",
      phone: "",
      paymentTerms: "",
      hasDeliveryDay: false,
      unreviewedItemCount: 2,
    });
    // information 2 (abn + other) + contact 3 + payment 1 + delivery 1 + items 2
    expect(r.total).toBe(9);
    expect(r.complete).toBe(false);
  });
});
