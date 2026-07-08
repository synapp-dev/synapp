/**
 * Strict supplier "readiness" — what's still outstanding before a supplier is
 * fully set up for ordering. Pure and shared so the suppliers table (derived on
 * the server from the persisted row) and the detail drawer (derived live from
 * the in-progress draft) always agree on what counts as missing.
 *
 * Each section maps 1:1 to a drawer sidebar tab so its outstanding count can be
 * surfaced as an amber badge there, and summed for the table's row highlight.
 * The field-level `missing` list lets the drawer ring the exact inputs and
 * spell out what's missing in a banner above each form.
 */

export const SUPPLIER_READINESS_SECTIONS = [
  "information",
  "contact",
  "payment",
  "delivery",
  "items",
] as const;

export type SupplierReadinessSection =
  (typeof SUPPLIER_READINESS_SECTIONS)[number];

/** Form-level fields we check. The "items" section is a count, not a field. */
export type SupplierReadinessField =
  | "name"
  | "abn"
  | "category"
  | "email"
  | "contactPerson"
  | "phone"
  | "paymentTerms"
  | "delivery";

/** Which section each field lives in, and the label shown to the user. */
export const SUPPLIER_READINESS_FIELD_META: Record<
  SupplierReadinessField,
  { section: SupplierReadinessSection; label: string }
> = {
  name: { section: "information", label: "a supplier name" },
  abn: { section: "information", label: "an ABN" },
  category: { section: "information", label: "a category" },
  email: { section: "contact", label: "a contact email" },
  contactPerson: { section: "contact", label: "a contact person" },
  phone: { section: "contact", label: "a phone number" },
  paymentTerms: { section: "payment", label: "payment terms" },
  delivery: { section: "delivery", label: "a delivery day" },
};

export type SupplierReadinessInput = {
  name: string;
  abn: string;
  /** Supplier category; "other" is treated as not-yet-classified. */
  category: string;
  email: string;
  contactPerson: string;
  phone: string;
  paymentTerms: string;
  /** True when at least one delivery/order day is configured. */
  hasDeliveryDay: boolean;
  /** Raw items still awaiting an approve/skip decision (across all items). */
  unreviewedItemCount: number;
  /**
   * Whether this supplier is flagged as an inventory source. Only inventory
   * suppliers must yield inventory items. Omitted → treated as not an inventory
   * source (no catalog requirement), preserving legacy behaviour.
   */
  isInventorySource?: boolean;
  /**
   * Raw items flagged likely-inventory (regardless of review). Reviewing no
   * longer creates products — mapping happens at normalisation — so coverage
   * keys off "does this supplier yield any stock at all", not a priced catalog.
   */
  inventoryItemCount?: number;
  /**
   * Whether the user has consciously parked this supplier as "no catalog yet"
   * (kept on file, can't be read from invoices yet). Suppresses the catalog
   * requirement while {@link inventoryItemCount} is 0.
   */
  noCatalogAcked?: boolean;
};

export type SupplierReadiness = {
  /** Outstanding count per drawer section (0 = that section is complete). */
  outstanding: Record<SupplierReadinessSection, number>;
  /** Field-level misses for ringing inputs and form banners (excludes items). */
  missing: SupplierReadinessField[];
  /** Sum across sections — 0 means the supplier is fully ready. */
  total: number;
  complete: boolean;
  /**
   * True when an inventory supplier yielded no inventory items at all and
   * hasn't been parked as "no catalog yet" — the one outstanding "items" unit
   * in that case. Lets the UI label it distinctly from unreviewed raw items.
   */
  needsCatalog: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (value: string): boolean => value.trim().length === 0;

export function evaluateSupplierReadiness(
  input: SupplierReadinessInput,
): SupplierReadiness {
  const missing: SupplierReadinessField[] = [];
  if (isBlank(input.name)) missing.push("name");
  if (isBlank(input.abn)) missing.push("abn");
  if (input.category === "other" || isBlank(input.category)) {
    missing.push("category");
  }
  if (!EMAIL_PATTERN.test(input.email.trim())) missing.push("email");
  if (isBlank(input.contactPerson)) missing.push("contactPerson");
  if (isBlank(input.phone)) missing.push("phone");
  if (isBlank(input.paymentTerms)) missing.push("paymentTerms");
  if (!input.hasDeliveryDay) missing.push("delivery");

  const countIn = (section: SupplierReadinessSection): number =>
    missing.filter((f) => SUPPLIER_READINESS_FIELD_META[f].section === section)
      .length;

  // An inventory supplier that finished triage but yielded no inventory items
  // at all (nothing parsed, or everything really was fees/packaging) can't be
  // order-ready until it either gains an item or is consciously parked — that's
  // the one outstanding "items" unit. Gated on unreviewedItemCount === 0 so a
  // supplier whose items are merely *awaiting triage* isn't mistaken for empty
  // (that work is already represented by the unreviewed count). Keyed off the
  // live inventoryItemCount, so it self-corrects once an item exists (e.g. a
  // rescue or a new invoice) even if a stale ack lingers.
  const needsCatalog =
    (input.isInventorySource ?? false) &&
    (input.inventoryItemCount ?? 0) === 0 &&
    Math.max(0, input.unreviewedItemCount) === 0 &&
    !(input.noCatalogAcked ?? false);
  const items = Math.max(0, input.unreviewedItemCount) + (needsCatalog ? 1 : 0);
  const outstanding: Record<SupplierReadinessSection, number> = {
    information: countIn("information"),
    contact: countIn("contact"),
    payment: countIn("payment"),
    delivery: countIn("delivery"),
    items,
  };
  const total =
    outstanding.information +
    outstanding.contact +
    outstanding.payment +
    outstanding.delivery +
    items;

  return { outstanding, missing, total, complete: total === 0, needsCatalog };
}
