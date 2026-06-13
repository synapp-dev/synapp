import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";
import {
  ensureVenueXeroAccessToken,
  loadVenueXeroConnectionForVenue,
} from "@/server/xero/load-venue-xero-connection";
import { listXeroSupplierContacts } from "@/server/xero/list-accounting-contacts";
import {
  mapXeroApiContact,
  normalizeSupplierName,
  type MappedXeroSupplier,
} from "@/server/xero/xero-contact-map";

export type XeroSuppliersSyncPayload = {
  created: number;
  updated: number;
  skipped: number;
  linkedInvoices: number;
  fetchedFromXero: number;
  lastSyncAt: string | null;
  error: string | null;
};

export class XeroSuppliersServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function resolveVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new XeroSuppliersServiceError(404, message),
    forbidden: (auth) => new XeroSuppliersServiceError(auth.status, auth.message),
  });
}

function findNameMatch(
  mapped: MappedXeroSupplier,
  existing: Awaited<ReturnType<typeof suppliersRepo.listActiveForOrganisation>>,
) {
  const target = normalizeSupplierName(mapped.name);
  return (
    existing.find(
      (s) => !s.xeroContactId && normalizeSupplierName(s.name) === target,
    ) ?? null
  );
}

async function upsertMappedContact(
  ctx: RequestAuthContext,
  args: {
    organisationId: string;
    userId: string;
    mapped: MappedXeroSupplier;
    existingByXero: Map<string, string>;
    existingRows: Awaited<ReturnType<typeof suppliersRepo.listActiveForOrganisation>>;
  },
): Promise<"created" | "updated" | "skipped"> {
  const existingId = args.existingByXero.get(args.mapped.xeroContactId);

  if (existingId) {
    await ctx.appDb.rls((tx) =>
      suppliersRepo.updateFromXero(tx, {
        organisationId: args.organisationId,
        supplierId: existingId,
        row: {
          name: args.mapped.name,
          email: args.mapped.email,
          orderingEmail: args.mapped.orderingEmail,
          phone: args.mapped.phone,
          abn: args.mapped.abn,
          addressLine1: args.mapped.addressLine1,
          addressLine2: args.mapped.addressLine2,
          suburb: args.mapped.suburb,
          state: args.mapped.state,
          postcode: args.mapped.postcode,
          country: args.mapped.country,
          orderMethod: args.mapped.orderingEmail ? "Email" : undefined,
          updatedBy: args.userId,
        },
      }),
    );
    return "updated";
  }

  const nameMatch = findNameMatch(args.mapped, args.existingRows);
  if (nameMatch) {
    await ctx.appDb.rls((tx) =>
      suppliersRepo.updateFromXero(tx, {
        organisationId: args.organisationId,
        supplierId: nameMatch.id,
        row: {
          xeroContactId: args.mapped.xeroContactId,
          name: args.mapped.name,
          email: args.mapped.email ?? nameMatch.email,
          orderingEmail: args.mapped.orderingEmail ?? nameMatch.orderingEmail,
          phone: args.mapped.phone ?? nameMatch.phone,
          abn: args.mapped.abn ?? nameMatch.abn,
          addressLine1: args.mapped.addressLine1 ?? nameMatch.addressLine1,
          addressLine2: args.mapped.addressLine2 ?? nameMatch.addressLine2,
          suburb: args.mapped.suburb ?? nameMatch.suburb,
          state: args.mapped.state ?? nameMatch.state,
          postcode: args.mapped.postcode ?? nameMatch.postcode,
          country: args.mapped.country ?? nameMatch.country,
          orderMethod: args.mapped.orderingEmail ? "Email" : nameMatch.orderMethod,
          updatedBy: args.userId,
        },
      }),
    );
    args.existingByXero.set(args.mapped.xeroContactId, nameMatch.id);
    return "updated";
  }

  const created = await ctx.appDb.rls((tx) =>
    suppliersRepo.createFromXero(tx, {
      organisationId: args.organisationId,
      venueId: null,
      name: args.mapped.name,
      contactPerson: null,
      email: args.mapped.email,
      orderingEmail: args.mapped.orderingEmail,
      phone: args.mapped.phone,
      abn: args.mapped.abn,
      addressLine1: args.mapped.addressLine1,
      addressLine2: args.mapped.addressLine2,
      suburb: args.mapped.suburb,
      state: args.mapped.state,
      postcode: args.mapped.postcode,
      country: args.mapped.country,
      category: "other",
      paymentTerms: null,
      deliveryDays: null,
      orderMethod: args.mapped.orderingEmail ? "Email" : null,
      active: true,
      xeroContactId: args.mapped.xeroContactId,
      createdBy: args.userId,
      updatedBy: args.userId,
    }),
  );
  args.existingByXero.set(args.mapped.xeroContactId, created.id);
  args.existingRows.push(created);
  return "created";
}

export async function syncVenueXeroSuppliers(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
  },
): Promise<XeroSuppliersSyncPayload> {
  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const connection = await loadVenueXeroConnectionForVenue(
    ctx.appDb,
    context.venueId,
  );
  if (!connection) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      linkedInvoices: 0,
      fetchedFromXero: 0,
      lastSyncAt: null,
      error: "Xero is not connected for this venue",
    };
  }

  const token = await ensureVenueXeroAccessToken(ctx.appDb, connection);
  if (!token.ok) {
    await suppliersRepo.markSupplierSyncError(ctx.appDb, context.venueId, token.message);
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      linkedInvoices: 0,
      fetchedFromXero: 0,
      lastSyncAt: null,
      error: token.message,
    };
  }

  const listed = await listXeroSupplierContacts({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
  });

  if (!listed.ok) {
    await suppliersRepo.markSupplierSyncError(ctx.appDb, context.venueId, listed.message);
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      linkedInvoices: 0,
      fetchedFromXero: 0,
      lastSyncAt: null,
      error: listed.message,
    };
  }

  const existingRows = await ctx.appDb.rls((tx) =>
    suppliersRepo.listActiveForOrganisation(tx, context.organisationId),
  );

  const existingByXero = new Map<string, string>();
  for (const row of existingRows) {
    if (row.xeroContactId) {
      existingByXero.set(row.xeroContactId, row.id);
    }
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of listed.contacts) {
    const mapped = mapXeroApiContact(raw);
    if (!mapped) {
      skipped += 1;
      continue;
    }

    try {
      const result = await upsertMappedContact(ctx, {
        organisationId: context.organisationId,
        userId: ctx.userId,
        mapped,
        existingByXero,
        existingRows,
      });
      if (result === "created") created += 1;
      else if (result === "updated") updated += 1;
      else skipped += 1;
    } catch (error) {
      console.error("[xero] supplier upsert failed", {
        xeroContactId: mapped.xeroContactId,
        name: mapped.name,
        error: error instanceof Error ? error.message : error,
      });
      skipped += 1;
    }
  }

  const linkedInvoices = await suppliersRepo.linkInvoicesToSuppliersByXeroContact(
    ctx.appDb,
    {
      organisationId: context.organisationId,
      venueId: context.venueId,
    },
  );

  const nowIso = new Date().toISOString();
  await suppliersRepo.markSupplierSyncSuccess(ctx.appDb, context.venueId, nowIso);

  console.info("[xero] supplier sync complete", {
    venueId: context.venueId,
    fetchedFromXero: listed.contacts.length,
    created,
    updated,
    skipped,
    linkedInvoices,
  });

  return {
    created,
    updated,
    skipped,
    linkedInvoices,
    fetchedFromXero: listed.contacts.length,
    lastSyncAt: nowIso,
    error: null,
  };
}

export async function resolveSupplierIdForXeroContact(
  ctx: RequestAuthContext,
  args: { organisationId: string; xeroContactId: string | null | undefined },
): Promise<string | null> {
  if (!args.xeroContactId) return null;
  const row = await ctx.appDb.rls((tx) =>
    suppliersRepo.findByXeroContactId(tx, {
      organisationId: args.organisationId,
      xeroContactId: args.xeroContactId!,
    }),
  );
  return row?.id ?? null;
}
