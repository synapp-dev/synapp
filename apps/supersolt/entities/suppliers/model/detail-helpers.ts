import type { ScheduleOverrideEntry } from "./schedule-types";
import type { SupplierDetail, UpsertSupplierInput } from "./types";

export function supplierDetailToUpsert(detail: SupplierDetail): UpsertSupplierInput {
  return {
    name: detail.name,
    contactPerson: detail.contactPerson,
    email: detail.email,
    phone: detail.phone,
    abn: detail.abn,
    category: detail.category,
    paymentTerms: detail.paymentTerms,
    deliveryDays: detail.deliveryDays,
    orderMethod: detail.orderMethod,
    active: detail.active,
    sharedAcrossVenues: detail.sharedAcrossVenues,
    addressLine1: detail.addressLine1,
    addressLine2: detail.addressLine2,
    suburb: detail.suburb,
    state: detail.state,
    postcode: detail.postcode,
    country: detail.country,
    isGstRegistered: detail.isGstRegistered,
    haccpCertified: detail.haccpCertified,
    certificateNumber: detail.certificateNumber,
    certificateExpiry: detail.certificateExpiry,
    notes: detail.notes,
    orderingEmail: detail.orderingEmail ?? detail.email,
    deliverySchedule: detail.deliverySchedule,
    scheduleOverrides: detail.scheduleOverrides,
  };
}

export function addScheduleOverride(
  overrides: ScheduleOverrideEntry[],
  input: { name: string; start_date: string; end_date: string; note: string }
): ScheduleOverrideEntry[] {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `ov-${Date.now()}`;
  return [
    ...overrides,
    {
      id,
      name: input.name,
      start_date: input.start_date,
      end_date: input.end_date,
      note: input.note,
    },
  ];
}
