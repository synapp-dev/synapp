import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import { isPlaceholderSupplierName } from "@/server/inventory-setup/fold-orphan-bills";
import {
  suggestSupplierMatch,
  type MatchCandidate,
  type OrphanMatch,
} from "@/server/inventory-setup/orphan-attribution";
import { suppliers, venueInvoices } from "@/server/db/schema";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";

export class OrphanAttributionServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new OrphanAttributionServiceError(error.status, error.message);
  }
  throw error;
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  try {
    return await resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
      notFound: (m) => new OrphanAttributionServiceError(404, m),
      forbidden: (a) => new OrphanAttributionServiceError(a.status, a.message),
    });
  } catch (error) {
    mapAuthError(error);
  }
}

export type OrphanBillSupplier = {
  placeholderSupplierId: string;
  placeholderName: string;
  /** Bills with a PDF attached — attributable. */
  attributableBills: number;
  /** Bills with no PDF (just a coded total) — no catalog value, skipped. */
  skippedNoPdfBills: number;
  /** PDF-header identity read off this orphan's bills, when available. */
  identity: { name: string | null; abn: string | null; email: string | null };
  /** Pre-filled suggestion: attribute to an existing supplier, or create new. */
  suggestion: OrphanMatch;
};

/**
 * Manual attribution queue: the un-foldable remainder of the orphan-bill fold.
 * Placeholder ("No Contact") suppliers that survived the fold (the foldable ones
 * were archived) and still carry PDF-bearing bills we couldn't attribute by
 * account code. Each is pre-filled with a suggested match read off the bill
 * PDF's header identity. Bills with no PDF are counted but not attributable
 * (a coded lump-sum total has no catalog value).
 */
export const orphanAttributionService = {
  async listForVenue(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<{ orphans: OrphanBillSupplier[] }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    return ctx.appDb.rls(async (tx) => {
      // Non-archived placeholder suppliers with their venue bill PDF stats.
      const rows = await tx
        .select({
          id: suppliers.id,
          name: suppliers.name,
          abn: suppliers.abn,
          email: suppliers.email,
          attributable: sql<number>`count(${venueInvoices.id}) filter (where ${venueInvoices.attachmentStoragePath} is not null)`,
          noPdf: sql<number>`count(${venueInvoices.id}) filter (where ${venueInvoices.attachmentStoragePath} is null)`,
        })
        .from(suppliers)
        .leftJoin(
          venueInvoices,
          and(
            eq(venueInvoices.supplierId, suppliers.id),
            eq(venueInvoices.venueId, scope.venueId),
          ),
        )
        .where(
          and(
            eq(suppliers.organisationId, scope.organisationId),
            isNull(suppliers.archivedAt),
          ),
        )
        .groupBy(suppliers.id, suppliers.name, suppliers.abn, suppliers.email);

      const placeholders = rows.filter(
        (r) => isPlaceholderSupplierName(r.name) && Number(r.attributable) > 0,
      );
      if (placeholders.length === 0) return { orphans: [] };

      // Real suppliers as match candidates for the PDF-header identity.
      const candidates: MatchCandidate[] = rows
        .filter((r) => !isPlaceholderSupplierName(r.name))
        .map((r) => ({ id: r.id, name: r.name, abn: r.abn, email: r.email }));

      const orphans: OrphanBillSupplier[] = placeholders.map((r) => {
        const identity = { name: r.name, abn: r.abn, email: r.email };
        return {
          placeholderSupplierId: r.id,
          placeholderName: r.name,
          attributableBills: Number(r.attributable),
          skippedNoPdfBills: Number(r.noPdf),
          identity,
          // Placeholder identity is whatever a prior PDF parse enriched onto the
          // row; with none, this falls back to "create new".
          suggestion: suggestSupplierMatch(identity, candidates),
        };
      });

      return { orphans };
    });
  },

  /**
   * Attribute all of a placeholder's bills to a real supplier — either an
   * existing one or a newly created one — then archive the placeholder. Mirrors
   * the fold's reattribution, but driven by the user's choice.
   */
  async attribute(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      placeholderSupplierId: string;
      target:
        | { kind: "existing"; supplierId: string }
        | { kind: "create"; name: string };
    },
  ): Promise<{ reassignedInvoices: number; supplierId: string }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const now = new Date().toISOString();

    return ctx.appDb.rls(async (tx) => {
      const placeholder = await suppliersRepo.getSupplierById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierId: args.placeholderSupplierId,
      });
      if (!placeholder || !isPlaceholderSupplierName(placeholder.name)) {
        throw new OrphanAttributionServiceError(404, "Orphan supplier not found");
      }

      let targetId: string;
      let targetName: string;
      if (args.target.kind === "existing") {
        const target = await suppliersRepo.getSupplierById(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          supplierId: args.target.supplierId,
        });
        if (!target) {
          throw new OrphanAttributionServiceError(404, "Target supplier not found");
        }
        targetId = target.id;
        targetName = target.name;
      } else {
        const name = args.target.name.trim();
        if (!name) {
          throw new OrphanAttributionServiceError(400, "Supplier name is required");
        }
        const created = await tx
          .insert(suppliers)
          .values({
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            name,
            // Carry over any PDF-derived identity the placeholder picked up.
            abn: placeholder.abn,
            email: placeholder.email,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          })
          .returning({ id: suppliers.id, name: suppliers.name });
        const row = created[0];
        if (!row) throw new OrphanAttributionServiceError(500, "Failed to create supplier");
        targetId = row.id;
        targetName = row.name;
      }

      const moved = await tx
        .update(venueInvoices)
        .set({ supplierId: targetId, supplierName: targetName, updatedAt: now })
        .where(
          and(
            eq(venueInvoices.organisationId, scope.organisationId),
            eq(venueInvoices.venueId, scope.venueId),
            eq(venueInvoices.supplierId, args.placeholderSupplierId),
            isNotNull(venueInvoices.attachmentStoragePath),
          ),
        )
        .returning({ id: venueInvoices.id });

      // Archive the placeholder once its attributable bills are reattributed.
      await tx
        .update(suppliers)
        .set({ archivedAt: now, updatedAt: now })
        .where(
          and(
            eq(suppliers.id, args.placeholderSupplierId),
            eq(suppliers.organisationId, scope.organisationId),
          ),
        );

      console.info("[inventory-setup] orphan_bill_attributed", {
        venueId: scope.venueId,
        from: args.placeholderSupplierId,
        to: targetId,
        kind: args.target.kind,
        reassignedInvoices: moved.length,
      });

      return { reassignedInvoices: moved.length, supplierId: targetId };
    });
  },
};
