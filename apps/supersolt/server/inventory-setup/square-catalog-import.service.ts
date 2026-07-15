import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import {
  INITIAL_SQUARE_CATALOG_IMPORT_STEPS,
  type ImportJobRow,
  type SquareCatalogImportResult,
  type SquareCatalogImportStepId,
} from "@/server/inventory-setup/inventory-setup-import-job.types";
import { inventorySetupImportJobRepo } from "@/server/inventory-setup/inventory-setup-import-job.repo";
import { InventorySetupImportJobTracker } from "@/server/inventory-setup/inventory-setup-import-job.tracker";
import { mapSquareCatalogToGroupDrafts } from "@/server/inventory-setup/map-square-catalog-to-group-drafts";
import { mapSquareCatalogToMenuDrafts } from "@/server/inventory-setup/map-square-catalog-to-menu-drafts";
import { mapSquareCatalogToModifierDrafts } from "@/server/inventory-setup/map-square-catalog-to-modifier-drafts";
import { menuCatalogLinksRepo } from "@/server/menu-items/menu-catalog-links.repo";
import { menuItemsRepo } from "@/server/menu-items/menu-items.repo";
import { posCatalogGroupsRepo } from "@/server/pos-catalog-import/pos-catalog-groups.repo";
import { posCatalogImportRepo } from "@/server/pos-catalog-import/pos-catalog-import.repo";
import { fetchAllSquareCatalogObjects } from "@/server/square/list-catalog";
import {
  listSquareLocations,
  pickDefaultSquareLocation,
} from "@/server/square/list-locations";
import { squareConnectionsRepo } from "@/server/square/square-connections.repo";

export class SquareCatalogImportServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new SquareCatalogImportServiceError(404, message),
    forbidden: (auth) => new SquareCatalogImportServiceError(auth.status, auth.message),
  });
}

export const squareCatalogImportService = {
  async createImportJob(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<ImportJobRow> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const existing = await inventorySetupImportJobRepo.findActiveForVenue(ctx.appDb, {
      venueId: scope.venueId,
      createdByUserId: ctx.userId,
      jobType: "square_catalog",
    });
    if (existing) {
      return existing;
    }

    return inventorySetupImportJobRepo.create(ctx.appDb, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      createdByUserId: ctx.userId,
      jobType: "square_catalog",
      steps: structuredClone(INITIAL_SQUARE_CATALOG_IMPORT_STEPS),
    });
  },

  async getActiveImportJob(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<ImportJobRow | null> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    return inventorySetupImportJobRepo.findActiveForVenue(ctx.appDb, {
      venueId: scope.venueId,
      createdByUserId: ctx.userId,
      jobType: "square_catalog",
    });
  },

  async getImportJob(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; jobId: string },
  ): Promise<ImportJobRow | null> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const job = await inventorySetupImportJobRepo.getById(ctx.appDb, args.jobId);
    if (!job || job.venueId !== scope.venueId || job.jobType !== "square_catalog") {
      return null;
    }
    return job;
  },

  async importFromSquare(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      jobId?: string;
    },
  ): Promise<SquareCatalogImportResult> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    let tracker: InventorySetupImportJobTracker | null = null;
    if (args.jobId) {
      const job = await inventorySetupImportJobRepo.getById(ctx.appDb, args.jobId);
      if (!job || job.venueId !== scope.venueId) {
        throw new SquareCatalogImportServiceError(404, "Import job not found");
      }
      if (job.jobType !== "square_catalog") {
        throw new SquareCatalogImportServiceError(400, "Import job is not a Square catalog job");
      }

      if (job.status === "completed" && job.result) {
        return job.result as SquareCatalogImportResult;
      }

      if (job.status === "running") {
        throw new SquareCatalogImportServiceError(409, "Import already in progress");
      }

      if (job.status === "failed") {
        throw new SquareCatalogImportServiceError(
          500,
          job.errorMessage ?? "Import failed",
        );
      }

      tracker = new InventorySetupImportJobTracker(ctx.appDb, args.jobId, job.steps);
      const claimed = await tracker.start();
      if (!claimed) {
        throw new SquareCatalogImportServiceError(409, "Import already in progress");
      }
    }

    const fail = async (message: string, stepId?: SquareCatalogImportStepId) => {
      if (tracker && stepId) {
        await tracker.failStep(stepId, message);
      }
      if (tracker) {
        await tracker.fail(message);
      }
      return {
        menuItems: { created: 0, updated: 0, skipped: 0 },
        groups: { upserted: 0 },
        modifiers: { lists: 0, modifiers: 0, links: 0 },
        catalogPages: 0,
        variationsSeen: 0,
        seenCatalogObjectIds: [],
        error: message,
      };
    };

    try {
      await tracker?.beginStep("verify_connection");
      let connection = await squareConnectionsRepo.loadConnectionForVenue(
        ctx.appDb,
        scope.venueId,
        false,
      );
      if (!connection?.squareAccessToken) {
        return fail("Square is not connected for this venue", "verify_connection");
      }

      let locationId = connection.squareLocationId?.trim() ?? "";
      let locationLabel = locationId;
      if (!locationId) {
        const locationsResult = await listSquareLocations({
          accessToken: connection.squareAccessToken,
          storedEnvironment: connection.environment,
        });
        if (!locationsResult.ok) {
          return fail(locationsResult.message, "verify_connection");
        }

        const picked = pickDefaultSquareLocation(locationsResult.locations);
        if (!picked) {
          const names = locationsResult.locations
            .map((location) => location.name)
            .slice(0, 5)
            .join(", ");
          return fail(
            locationsResult.locations.length > 1
              ? `This Square account has multiple locations (${names}). Choose a location in Settings → Integrations, then import again.`
              : "No active Square locations found for this account",
            "verify_connection",
          );
        }

        locationId = picked.id;
        locationLabel = picked.name;
        await squareConnectionsRepo.updateLocationId(ctx.appDb, {
          venueId: scope.venueId,
          squareLocationId: locationId,
        });
        connection = { ...connection, squareLocationId: locationId };
      } else {
        const locationsResult = await listSquareLocations({
          accessToken: connection.squareAccessToken,
          storedEnvironment: connection.environment,
        });
        if (locationsResult.ok) {
          const match = locationsResult.locations.find((location) => location.id === locationId);
          if (match) {
            locationLabel = match.name;
          }
        }
      }

      await tracker?.completeStep(
        "verify_connection",
        locationLabel ? `Using Square location: ${locationLabel}` : "Square connected",
      );

      await tracker?.beginStep("fetch_catalog");
      const fetched = await fetchAllSquareCatalogObjects({
        accessToken: connection.squareAccessToken,
        storedEnvironment: connection.environment,
        onPage: tracker
          ? async (progress) => {
              await tracker.updateStepDetail(
                "fetch_catalog",
                `Fetching page ${progress.current}`,
                { current: progress.current, total: progress.total ?? progress.current },
              );
            }
          : undefined,
      });

      if (!fetched.ok) {
        return fail(fetched.message, "fetch_catalog");
      }

      const drafts = mapSquareCatalogToMenuDrafts({
        objects: fetched.objects,
        locationId,
      });
      const groupDrafts = mapSquareCatalogToGroupDrafts({
        objects: fetched.objects,
        locationId,
      });
      const modifierDrafts = mapSquareCatalogToModifierDrafts({
        objects: fetched.objects,
        locationId,
      });
      const seenIds = new Set(drafts.map((draft) => draft.squareCatalogObjectId));

      await tracker?.completeStep(
        "fetch_catalog",
        `${fetched.pages} pages, ${drafts.length} sellable variations`,
      );

      const nowIso = new Date().toISOString();

      // Subcategory groups first so menu items can resolve their group_id.
      await tracker?.beginStep("upsert_groups");
      const groupIdBySquareItemId = new Map<string, string>();
      for (let index = 0; index < groupDrafts.length; index += 1) {
        const group = groupDrafts[index]!;
        const groupId = await ctx.appDb.rls((tx) =>
          posCatalogGroupsRepo.upsertGroup(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            squareItemId: group.squareItemId,
            name: group.name,
            sectionName: group.sectionName,
            description: group.description,
            squareRaw: group.squareRaw,
            updatedAt: nowIso,
          }),
        );
        groupIdBySquareItemId.set(group.squareItemId, groupId);
      }
      await tracker?.completeStep(
        "upsert_groups",
        `${groupDrafts.length} subcategories`,
      );

      await tracker?.beginStep("upsert_menu_items");
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (let index = 0; index < drafts.length; index += 1) {
        const draft = drafts[index]!;
        const groupId = groupIdBySquareItemId.get(draft.squareItemId) ?? null;
        if (tracker && (index === 0 || (index + 1) % 5 === 0 || index === drafts.length - 1)) {
          await tracker.updateStepDetail(
            "upsert_menu_items",
            `Importing ${draft.name}`,
            { current: index + 1, total: drafts.length },
          );
        }

        const outcome = await ctx.appDb.rls(async (tx) => {
          const existingLink = await posCatalogImportRepo.getLinkByCatalogObjectId(tx, {
            venueId: scope.venueId,
            squareCatalogObjectId: draft.squareCatalogObjectId,
          });

          if (existingLink) {
            const updatedRow = await menuItemsRepo.updateMenuItem(tx, {
              organisationId: scope.organisationId,
              venueId: scope.venueId,
              menuItemId: existingLink.menuItemId,
              // showOnMenu deliberately not updated: Square's sold-out flag only
              // seeds it on create. Re-imports must not clobber user toggles or
              // sales-driven activation (status still refreshes as info).
              row: {
                name: draft.name,
                sectionName: draft.sectionName,
                priceCents: draft.priceCents,
                status: draft.status,
                isActive: draft.status === "active",
                groupId,
                squareRaw: draft.squareRaw,
                updatedAt: nowIso,
              },
            });
            return updatedRow ? ("updated" as const) : ("skipped" as const);
          }

          const menuItem = await menuItemsRepo.createMenuItem(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            name: draft.name,
            sectionName: draft.sectionName,
            priceCents: draft.priceCents,
            showOnMenu: draft.showOnMenu,
            status: draft.status,
            isActive: draft.status === "active",
            groupId,
            squareRaw: draft.squareRaw,
            createdAt: nowIso,
            updatedAt: nowIso,
          });

          await menuCatalogLinksRepo.createLink(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            menuItemId: menuItem.id,
            squareCatalogObjectId: draft.squareCatalogObjectId,
            updatedAt: nowIso,
          });

          return "created" as const;
        });

        if (outcome === "created") created += 1;
        else if (outcome === "updated") updated += 1;
        else skipped += 1;
      }

      await tracker?.completeStep(
        "upsert_menu_items",
        `${created} created, ${updated} updated`,
      );

      // Modifier catalog: lists → modifiers → item/group attachments.
      await tracker?.beginStep("upsert_modifiers");
      const modifierListIdBySquareId = new Map<string, string>();
      for (const list of modifierDrafts.lists) {
        const listId = await ctx.appDb.rls((tx) =>
          posCatalogGroupsRepo.upsertModifierList(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            squareModifierListId: list.squareModifierListId,
            name: list.name,
            selectionType: list.selectionType,
            minSelected: list.minSelected,
            maxSelected: list.maxSelected,
            squareRaw: list.squareRaw,
            updatedAt: nowIso,
          }),
        );
        modifierListIdBySquareId.set(list.squareModifierListId, listId);
      }

      let modifiersUpserted = 0;
      for (const modifier of modifierDrafts.modifiers) {
        const modifierListId = modifierListIdBySquareId.get(
          modifier.squareModifierListId,
        );
        if (!modifierListId) continue;
        await ctx.appDb.rls((tx) =>
          posCatalogGroupsRepo.upsertModifier(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            modifierListId,
            squareModifierId: modifier.squareModifierId,
            name: modifier.name,
            priceCents: modifier.priceCents,
            squareRaw: modifier.squareRaw,
            updatedAt: nowIso,
          }),
        );
        modifiersUpserted += 1;
      }

      let linksUpserted = 0;
      for (const link of modifierDrafts.links) {
        const groupId = groupIdBySquareItemId.get(link.squareItemId);
        const modifierListId = modifierListIdBySquareId.get(
          link.squareModifierListId,
        );
        if (!groupId || !modifierListId) continue;
        await ctx.appDb.rls((tx) =>
          posCatalogGroupsRepo.upsertGroupModifierLink(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            groupId,
            modifierListId,
            enabled: link.enabled,
            minSelected: link.minSelected,
            maxSelected: link.maxSelected,
            updatedAt: nowIso,
          }),
        );
        linksUpserted += 1;
      }

      await tracker?.completeStep(
        "upsert_modifiers",
        `${modifierDrafts.lists.length} lists, ${modifiersUpserted} modifiers`,
      );

      const result: SquareCatalogImportResult = {
        menuItems: { created, updated, skipped },
        groups: { upserted: groupDrafts.length },
        modifiers: {
          lists: modifierDrafts.lists.length,
          modifiers: modifiersUpserted,
          links: linksUpserted,
        },
        catalogPages: fetched.pages,
        variationsSeen: drafts.length,
        seenCatalogObjectIds: [...seenIds],
        error: null,
      };

      await tracker?.beginStep("summary");
      await tracker?.completeStep("summary", "Import complete");
      await tracker?.complete(result);

      console.info("[pos-catalog-import] import_completed", {
        venueId: scope.venueId,
        ...result,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Square catalog import failed";
      if (tracker) {
        await tracker.fail(message);
      }
      throw error instanceof SquareCatalogImportServiceError
        ? error
        : new SquareCatalogImportServiceError(500, message);
    }
  },
};
