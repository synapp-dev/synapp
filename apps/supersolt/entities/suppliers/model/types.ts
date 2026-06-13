import type { DeliveryScheduleEntry, ScheduleOverrideEntry } from "./schedule-types";

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
  productCount: number;
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
