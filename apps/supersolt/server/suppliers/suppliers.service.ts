import type {
  DeliveryScheduleEntry,
  ScheduleOverrideEntry,
} from "@/entities/suppliers/model/schedule-types";
import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import {
  suppliersRepo,
  type SupplierInsert,
  type SupplierRow,
  type SupplierUpdate,
} from "@/server/suppliers/suppliers.repo";
import {
  parseDeliverySchedule,
  parseScheduleOverrides,
  serializeDeliverySchedule,
  serializeScheduleOverrides,
} from "@/server/suppliers/supplier-schedule";

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
  orderingEmail?: string;
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

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new SuppliersServiceError(error.status, error.message);
  }
  throw error;
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

function toSummary(
  row: SupplierRow,
  metrics?: { productCount: number; ytdSpendCents: number; lastInvoiceDate: string | null },
): SupplierSummary {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contactPerson ?? "",
    email: row.email ?? "",
    orderingEmail: row.orderingEmail ?? row.email ?? "",
    phone: row.phone ?? "",
    abn: row.abn ?? "",
    category: row.category as SupplierCategory,
    active: row.active,
    sharedAcrossVenues: row.venueId === null,
    paymentTerms: row.paymentTerms ?? "",
    deliveryDays: row.deliveryDays ?? "",
    orderMethod: row.orderMethod ?? "",
    monthlySpendCents: metrics?.ytdSpendCents ?? 0,
    ytdSpendCents: metrics?.ytdSpendCents ?? 0,
    productCount: metrics?.productCount ?? 0,
    lastInvoiceDate: metrics?.lastInvoiceDate ?? null,
    updatedAt: row.updatedAt,
  };
}

function toDetail(
  row: SupplierRow,
  metrics?: { productCount: number; ytdSpendCents: number; lastInvoiceDate: string | null },
): SupplierDetail {
  return {
    ...toSummary(row, metrics),
    addressLine1: row.addressLine1 ?? "",
    addressLine2: row.addressLine2 ?? "",
    suburb: row.suburb ?? "",
    state: row.state ?? "",
    postcode: row.postcode ?? "",
    country: row.country ?? "",
    isGstRegistered: row.isGstRegistered,
    deliverySchedule: parseDeliverySchedule(row.deliverySchedule as never),
    scheduleOverrides: parseScheduleOverrides(row.scheduleOverrides as never),
    haccpCertified: row.haccpCertified,
    certificateNumber: row.certificateNumber ?? "",
    certificateExpiry: row.certificateExpiry,
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

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new SuppliersServiceError(404, message),
    forbidden: (auth) => new SuppliersServiceError(auth.status, auth.message),
  });
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
  existing: SupplierRow,
  core: ReturnType<typeof normalizeUpsertInput>,
  input: UpsertSupplierInput,
  userId: string,
): SupplierUpdate {
  const now = new Date().toISOString();
  return {
    name: core.name,
    contactPerson: core.contactPerson || null,
    email: core.email || null,
    phone: core.phone || null,
    abn: core.abn || null,
    category: core.category,
    paymentTerms: core.paymentTerms || null,
    deliveryDays: core.deliveryDays || null,
    orderMethod: core.orderMethod || null,
    active: core.active,
    addressLine1: strOrNull(input.addressLine1, existing.addressLine1),
    addressLine2: strOrNull(input.addressLine2, existing.addressLine2),
    suburb: strOrNull(input.suburb, existing.suburb),
    state: strOrNull(input.state, existing.state),
    postcode: strOrNull(input.postcode, existing.postcode),
    country: strOrNull(input.country, existing.country),
    isGstRegistered:
      input.isGstRegistered !== undefined
        ? input.isGstRegistered
        : existing.isGstRegistered,
    haccpCertified:
      input.haccpCertified !== undefined
        ? input.haccpCertified
        : existing.haccpCertified,
    certificateNumber: strOrNull(
      input.certificateNumber,
      existing.certificateNumber,
    ),
    certificateExpiry:
      input.certificateExpiry !== undefined
        ? input.certificateExpiry === null || input.certificateExpiry === ""
          ? null
          : input.certificateExpiry
        : existing.certificateExpiry,
    notes: strOrNull(input.notes, existing.notes),
    orderingEmail: strOrNull(input.orderingEmail, existing.orderingEmail),
    deliverySchedule:
      input.deliverySchedule !== undefined
        ? serializeDeliverySchedule(input.deliverySchedule)
        : existing.deliverySchedule,
    scheduleOverrides:
      input.scheduleOverrides !== undefined
        ? serializeScheduleOverrides(input.scheduleOverrides)
        : existing.scheduleOverrides,
    updatedBy: userId,
    updatedAt: now,
  };
}

function resolveVenueIdOnUpdate(
  existing: SupplierRow,
  core: ReturnType<typeof normalizeUpsertInput>,
  contextVenueId: string,
): string | null {
  if (core.sharedAcrossVenues) {
    return null;
  }
  if (existing.venueId === null) {
    return contextVenueId;
  }
  return existing.venueId;
}

export const suppliersService = {
  async list(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      search?: string;
      category?: string;
      status?: string;
      archived?: boolean;
      hasProducts?: boolean;
      sort?: "name" | "last_invoice" | "ytd_spend";
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ suppliers: SupplierSummary[]; total: number }> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = clampNumber(Number(args.pageSize ?? 20), 1, 200);
    let category: string | undefined;
    if (args.category && args.category !== "all") {
      category = assertSupplierCategory(args.category);
    }

    const result = await ctx.appDb.rls((tx) =>
      suppliersRepo.listSuppliers(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        search: args.search?.trim() || undefined,
        category,
        status: args.status,
        archived: args.archived,
        hasProducts: args.hasProducts,
        sort: args.sort,
        page,
        pageSize,
      }),
    );

    const supplierIds = result.rows.map((r) => r.id);
    const metricsMap = await ctx.appDb.rls((tx) =>
      suppliersRepo.getSupplierMetrics(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierIds,
      }),
    );

    let suppliers = result.rows.map((row) =>
      toSummary(row, metricsMap.get(row.id)),
    );

    if (args.sort === "ytd_spend") {
      suppliers = [...suppliers].sort((a, b) => b.ytdSpendCents - a.ytdSpendCents);
    } else if (args.sort === "last_invoice") {
      suppliers = [...suppliers].sort((a, b) => {
        const aDate = a.lastInvoiceDate ?? "";
        const bDate = b.lastInvoiceDate ?? "";
        return bDate.localeCompare(aDate);
      });
    }

    return {
      suppliers,
      total: result.total,
    };
  },

  async getById(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
    },
  ): Promise<SupplierDetail | null> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const row = await ctx.appDb.rls((tx) =>
      suppliersRepo.getSupplierById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.supplierId,
      }),
    );

    if (!row) return null;

    const metricsMap = await ctx.appDb.rls((tx) =>
      suppliersRepo.getSupplierMetrics(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierIds: [args.supplierId],
      }),
    );

    return toDetail(row, metricsMap.get(args.supplierId));
  },

  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      input: UpsertSupplierInput;
    },
  ): Promise<SupplierDetail> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const payload = normalizeUpsertInput(args.input);
    const now = new Date().toISOString();

    const insertRow: SupplierInsert = {
      organisationId: scope.organisationId,
      venueId: payload.sharedAcrossVenues ? null : scope.venueId,
      name: payload.name,
      contactPerson: payload.contactPerson || null,
      email: payload.email || null,
      phone: payload.phone || null,
      abn: payload.abn || null,
      category: payload.category,
      paymentTerms: payload.paymentTerms || null,
      deliveryDays: payload.deliveryDays || null,
      orderMethod: payload.orderMethod || null,
      active: payload.active,
      addressLine1:
        args.input.addressLine1 !== undefined
          ? strOrNull(args.input.addressLine1, null)
          : null,
      addressLine2:
        args.input.addressLine2 !== undefined
          ? strOrNull(args.input.addressLine2, null)
          : null,
      suburb:
        args.input.suburb !== undefined ? strOrNull(args.input.suburb, null) : null,
      state:
        args.input.state !== undefined ? strOrNull(args.input.state, null) : null,
      postcode:
        args.input.postcode !== undefined
          ? strOrNull(args.input.postcode, null)
          : null,
      country:
        args.input.country !== undefined
          ? strOrNull(args.input.country, null)
          : null,
      isGstRegistered: args.input.isGstRegistered ?? true,
      haccpCertified: args.input.haccpCertified ?? false,
      certificateNumber:
        args.input.certificateNumber !== undefined
          ? strOrNull(args.input.certificateNumber, null)
          : null,
      certificateExpiry:
        args.input.certificateExpiry === undefined ||
        args.input.certificateExpiry === ""
          ? null
          : args.input.certificateExpiry,
      notes:
        args.input.notes !== undefined ? strOrNull(args.input.notes, null) : null,
      orderingEmail:
        args.input.orderingEmail !== undefined
          ? strOrNull(args.input.orderingEmail, null)
          : null,
      deliverySchedule:
        args.input.deliverySchedule !== undefined
          ? serializeDeliverySchedule(args.input.deliverySchedule)
          : [],
      scheduleOverrides:
        args.input.scheduleOverrides !== undefined
          ? serializeScheduleOverrides(args.input.scheduleOverrides)
          : [],
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      updatedAt: now,
    };

    const created = await ctx.appDb.rls((tx) =>
      suppliersRepo.createSupplier(tx, insertRow),
    );

    return toDetail(created);
  },

  async update(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      input: UpsertSupplierInput;
    },
  ): Promise<SupplierDetail | null> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const updated = await ctx.appDb.rls(async (tx) => {
      const existing = await suppliersRepo.getSupplierById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.supplierId,
      });

      if (!existing) {
        return null;
      }

      const payload = normalizeUpsertInput(args.input);
      const row = buildUpdateRow(existing, payload, args.input, ctx.userId);
      row.venueId = resolveVenueIdOnUpdate(existing, payload, scope.venueId);

      return suppliersRepo.updateSupplier(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.supplierId,
        row,
      });
    });

    return updated ? toDetail(updated) : null;
  },

  async delete(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
    },
  ): Promise<boolean> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    return ctx.appDb.rls((tx) =>
      suppliersRepo.softDeleteSupplier(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.supplierId,
      }),
    );
  },
};
