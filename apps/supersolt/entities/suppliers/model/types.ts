import type { DeliveryScheduleEntry, ScheduleOverrideEntry } from "./schedule-types";
import type { SupplierReadiness } from "./supplier-readiness";

export type { DeliveryScheduleEntry, ScheduleOverrideEntry } from "./schedule-types";

export type SupplierCategory =
  | "produce"
  | "meat"
  | "dry-goods"
  | "beverages"
  | "equipment"
  | "other";

export type SupplierSummary = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  orderingEmail: string;
  phone: string;
  abn: string;
  category: SupplierCategory;
  active: boolean;
  sharedAcrossVenues: boolean;
  paymentTerms: string;
  deliveryDays: string;
  orderMethod: string;
  monthlySpendCents: number;
  ytdSpendCents: number;
  itemCount: number;
  /** Detected raw items still awaiting an approve/skip decision. */
  unreviewedItemCount: number;
  /** Approved supplier_products — the supplier's priced catalog. */
  productCount: number;
  /** Likely-inventory items: unique products + total raw items parsed. */
  inventoryItems: { unique: number; parsed: number };
  /** Non-inventory items (packaging, fees…): unique + total parsed. */
  nonInventoryItems: { unique: number; parsed: number };
  /** Whether this supplier is flagged as an inventory source. */
  isInventorySource: boolean;
  /** Whether the user has parked this supplier as "no catalog yet". */
  noCatalogAcked: boolean;
  readiness: SupplierReadiness;
  lastInvoiceDate: string | null;
  updatedAt: string;
};

export type SupplierDetail = SupplierSummary & {
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  isGstRegistered: boolean;
  deliverySchedule: DeliveryScheduleEntry[];
  scheduleOverrides: ScheduleOverrideEntry[];
  haccpCertified: boolean;
  certificateNumber: string;
  certificateExpiry: string | null;
  notes: string;
  orderingEmail?: string;
};

export type SupplierListResponse = {
  suppliers: SupplierSummary[];
  total: number;
};

/** Bot-inferred values for empty supplier fields (currently just category). */
export type SupplierFieldSuggestions = {
  category: SupplierCategory | null;
};

export type UpsertSupplierInput = {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  abn?: string;
  category: SupplierCategory;
  paymentTerms?: string;
  deliveryDays?: string;
  orderMethod?: string;
  active: boolean;
  sharedAcrossVenues: boolean;
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  isGstRegistered?: boolean;
  haccpCertified?: boolean;
  certificateNumber?: string;
  certificateExpiry?: string | null;
  notes?: string;
  orderingEmail?: string;
  deliverySchedule?: DeliveryScheduleEntry[];
  scheduleOverrides?: ScheduleOverrideEntry[];
};
