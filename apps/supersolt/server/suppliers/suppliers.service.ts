import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import type {
  DeliveryScheduleEntry,
  ScheduleOverrideEntry,
} from "@/entities/suppliers/model/schedule-types";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";
import {
  parseDeliverySchedule,
  parseScheduleOverrides,
  serializeDeliverySchedule,
  serializeScheduleOverrides,
} from "@/server/suppliers/supplier-schedule";

type Supabase = SupabaseClient<Database>;

const SUPPLIER_CATEGORIES = [
  "produce",
  "meat",
  "dry-goods",
  "beverages",
  "equipment",
  "other",
] as const;

export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];

export type SupplierSummary = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  abn: string;
  category: SupplierCategory;
  active: boolean;
  sharedAcrossVenues: boolean;
  paymentTerms: string;
  deliveryDays: string;
  orderMethod: string;
  monthlySpendCents: number;
  productCount: number;
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
};

export type UpsertSupplierInput = {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  abn?: string;
  category: string;
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
  deliverySchedule?: DeliveryScheduleEntry[];
  scheduleOverrides?: ScheduleOverrideEntry[];
};

export class SuppliersServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function assertSupplierCategory(value: string): SupplierCategory {
  if (!SUPPLIER_CATEGORIES.includes(value as SupplierCategory)) {
    throw new SuppliersServiceError(400, "Invalid supplier category");
  }
  return value as SupplierCategory;
}

function toSummary(row: Database["public"]["Tables"]["suppliers"]["Row"]): SupplierSummary {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    abn: row.abn ?? "",
    category: row.category as SupplierCategory,
    active: row.active,
    sharedAcrossVenues: row.venue_id === null,
    paymentTerms: row.payment_terms ?? "",
    deliveryDays: row.delivery_days ?? "",
    orderMethod: row.order_method ?? "",
    monthlySpendCents: 0,
    productCount: 0,
    updatedAt: row.updated_at,
  };
}

function toDetail(row: Database["public"]["Tables"]["suppliers"]["Row"]): SupplierDetail {
  return {
    ...toSummary(row),
    addressLine1: row.address_line1 ?? "",
    addressLine2: row.address_line2 ?? "",
    suburb: row.suburb ?? "",
    state: row.state ?? "",
    postcode: row.postcode ?? "",
    country: row.country ?? "",
    isGstRegistered: row.is_gst_registered,
    deliverySchedule: parseDeliverySchedule(row.delivery_schedule),
    scheduleOverrides: parseScheduleOverrides(row.schedule_overrides),
    haccpCertified: row.haccp_certified,
    certificateNumber: row.certificate_number ?? "",
    certificateExpiry: row.certificate_expiry,
    notes: row.notes ?? "",
  };
}

function strOrNull(v: string | undefined, existing: string | null): string | null {
  if (v !== undefined) {
    const t = v.trim();
    return t.length === 0 ? null : t;
  }
  return existing;
}

async function assertVenueAccess(
  supabase: Supabase,
  args: {
    userId: string;
    organisationId: string;
    venueId: string;
  }
): Promise<void> {
  const { data, error } = await supabase
    .from("user_organisations")
    .select("id")
    .eq("user_profile_id", args.userId)
    .eq("organisation_id", args.organisationId)
    .eq("is_active", true)
    .is("archived_at", null);

  if (error) {
    throw new SuppliersServiceError(500, error.message);
  }

  const membershipIds = (data ?? []).map((item) => item.id);
  if (membershipIds.length === 0) {
    throw new SuppliersServiceError(403, "Forbidden");
  }

  const { data: venueAccess, error: venueError } = await supabase
    .from("user_venues")
    .select("id")
    .in("user_organisation_id", membershipIds)
    .eq("venue_id", args.venueId)
    .eq("is_active", true)
    .is("archived_at", null)
    .limit(1);

  if (venueError) {
    throw new SuppliersServiceError(500, venueError.message);
  }

  if (!venueAccess || venueAccess.length === 0) {
    throw new SuppliersServiceError(403, "Forbidden");
  }
}

function normalizeUpsertInput(input: UpsertSupplierInput) {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new SuppliersServiceError(400, "Supplier name is required");
  }

  return {
    name,
    contactPerson: input.contactPerson?.trim() ?? "",
    email: input.email?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    abn: input.abn?.trim() ?? "",
    category: assertSupplierCategory(input.category),
    paymentTerms: input.paymentTerms?.trim() ?? "",
    deliveryDays: input.deliveryDays?.trim() ?? "",
    orderMethod: input.orderMethod?.trim() ?? "",
    active: Boolean(input.active),
    sharedAcrossVenues: Boolean(input.sharedAcrossVenues),
  };
}

function buildUpdateRow(
  existing: Database["public"]["Tables"]["suppliers"]["Row"],
  core: ReturnType<typeof normalizeUpsertInput>,
  input: UpsertSupplierInput,
  userId: string
): Database["public"]["Tables"]["suppliers"]["Update"] {
  const now = new Date().toISOString();
  return {
    name: core.name,
    contact_person: core.contactPerson || null,
    email: core.email || null,
    phone: core.phone || null,
    abn: core.abn || null,
    category: core.category,
    payment_terms: core.paymentTerms || null,
    delivery_days: core.deliveryDays || null,
    order_method: core.orderMethod || null,
    active: core.active,
    address_line1: strOrNull(input.addressLine1, existing.address_line1),
    address_line2: strOrNull(input.addressLine2, existing.address_line2),
    suburb: strOrNull(input.suburb, existing.suburb),
    state: strOrNull(input.state, existing.state),
    postcode: strOrNull(input.postcode, existing.postcode),
    country: strOrNull(input.country, existing.country),
    is_gst_registered:
      input.isGstRegistered !== undefined ? input.isGstRegistered : existing.is_gst_registered,
    haccp_certified:
      input.haccpCertified !== undefined ? input.haccpCertified : existing.haccp_certified,
    certificate_number: strOrNull(input.certificateNumber, existing.certificate_number),
    certificate_expiry:
      input.certificateExpiry !== undefined
        ? input.certificateExpiry === null || input.certificateExpiry === ""
          ? null
          : input.certificateExpiry
        : existing.certificate_expiry,
    notes: strOrNull(input.notes, existing.notes),
    delivery_schedule:
      input.deliverySchedule !== undefined
        ? serializeDeliverySchedule(input.deliverySchedule)
        : existing.delivery_schedule,
    schedule_overrides:
      input.scheduleOverrides !== undefined
        ? serializeScheduleOverrides(input.scheduleOverrides)
        : existing.schedule_overrides,
    updated_by: userId,
    updated_at: now,
  };
}

/** When un-sharing, pin supplier to current venue; when sharing, clear venue_id. */
function resolveVenueIdOnUpdate(
  existing: Database["public"]["Tables"]["suppliers"]["Row"],
  core: ReturnType<typeof normalizeUpsertInput>,
  contextVenueId: string
): string | null {
  if (core.sharedAcrossVenues) {
    return null;
  }
  if (existing.venue_id === null) {
    return contextVenueId;
  }
  return existing.venue_id;
}

export const suppliersService = {
  async list(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      search?: string;
      category?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ suppliers: SupplierSummary[]; total: number }> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new SuppliersServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = clampNumber(Number(args.pageSize ?? 20), 1, 200);
    let category: string | undefined;
    if (args.category && args.category !== "all") {
      category = assertSupplierCategory(args.category);
    }

    const result = await suppliersRepo.listSuppliers(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      search: args.search?.trim() || undefined,
      category,
      status: args.status,
      page,
      pageSize,
    });

    return {
      suppliers: result.rows.map(toSummary),
      total: result.total,
    };
  },

  async getById(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
    }
  ): Promise<SupplierDetail | null> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new SuppliersServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const row = await suppliersRepo.getSupplierById(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      supplierId: args.supplierId,
    });

    if (!row) {
      return null;
    }

    return toDetail(row);
  },

  async create(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      input: UpsertSupplierInput;
    }
  ): Promise<SupplierDetail> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new SuppliersServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const payload = normalizeUpsertInput(args.input);
    const now = new Date().toISOString();

    const created = await suppliersRepo.createSupplier(supabase, {
      organisation_id: context.organisationId,
      venue_id: payload.sharedAcrossVenues ? null : context.venueId,
      name: payload.name,
      contact_person: payload.contactPerson || null,
      email: payload.email || null,
      phone: payload.phone || null,
      abn: payload.abn || null,
      category: payload.category,
      payment_terms: payload.paymentTerms || null,
      delivery_days: payload.deliveryDays || null,
      order_method: payload.orderMethod || null,
      active: payload.active,
      address_line1: args.input.addressLine1 !== undefined ? strOrNull(args.input.addressLine1, null) : null,
      address_line2: args.input.addressLine2 !== undefined ? strOrNull(args.input.addressLine2, null) : null,
      suburb: args.input.suburb !== undefined ? strOrNull(args.input.suburb, null) : null,
      state: args.input.state !== undefined ? strOrNull(args.input.state, null) : null,
      postcode: args.input.postcode !== undefined ? strOrNull(args.input.postcode, null) : null,
      country: args.input.country !== undefined ? strOrNull(args.input.country, null) : null,
      is_gst_registered: args.input.isGstRegistered ?? true,
      haccp_certified: args.input.haccpCertified ?? false,
      certificate_number:
        args.input.certificateNumber !== undefined
          ? strOrNull(args.input.certificateNumber, null)
          : null,
      certificate_expiry:
        args.input.certificateExpiry === undefined || args.input.certificateExpiry === ""
          ? null
          : args.input.certificateExpiry,
      notes: args.input.notes !== undefined ? strOrNull(args.input.notes, null) : null,
      delivery_schedule:
        args.input.deliverySchedule !== undefined
          ? serializeDeliverySchedule(args.input.deliverySchedule)
          : [],
      schedule_overrides:
        args.input.scheduleOverrides !== undefined
          ? serializeScheduleOverrides(args.input.scheduleOverrides)
          : [],
      created_by: args.userId,
      updated_by: args.userId,
      updated_at: now,
    });

    return toDetail(created);
  },

  async update(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      input: UpsertSupplierInput;
    }
  ): Promise<SupplierDetail | null> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new SuppliersServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const existing = await suppliersRepo.getSupplierById(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      supplierId: args.supplierId,
    });

    if (!existing) {
      return null;
    }

    const payload = normalizeUpsertInput(args.input);
    const row = buildUpdateRow(existing, payload, args.input, args.userId);
    row.venue_id = resolveVenueIdOnUpdate(existing, payload, context.venueId);

    const updated = await suppliersRepo.updateSupplier(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      supplierId: args.supplierId,
      row,
    });

    if (!updated) {
      return null;
    }

    return toDetail(updated);
  },

  async delete(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
    }
  ): Promise<boolean> {
    const context = await ingredientsRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );

    if (!context) {
      throw new SuppliersServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    return suppliersRepo.softDeleteSupplier(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      supplierId: args.supplierId,
    });
  },
};
