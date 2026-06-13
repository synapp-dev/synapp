import type { RequestAuthContext } from "@/server/auth/context";
import { isOrganisationAdmin } from "@/server/auth/rbac";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import {
  menuCatalogLinksRepo,
  type MenuCatalogLinkRow,
} from "@/server/menu-items/menu-catalog-links.repo";

export class MenuCatalogLinksServiceError extends Error {
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
    notFound: (message) => new MenuCatalogLinksServiceError(404, message),
    forbidden: (auth) => new MenuCatalogLinksServiceError(auth.status, auth.message),
  });
}

function assertOrgAdmin(
  ctx: RequestAuthContext,
  organisationId: string,
) {
  if (!isOrganisationAdmin(ctx.tenantRoles, organisationId)) {
    throw new MenuCatalogLinksServiceError(403, "Org admin required");
  }
}

function pgUniqueViolation(error: unknown): boolean {
  const pgCode =
    error && typeof error === "object" && "cause" in error
      ? (error.cause as { code?: string } | undefined)?.code
      : (error as { code?: string }).code;
  return pgCode === "23505";
}

export const menuCatalogLinksService = {
  async list(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<MenuCatalogLinkRow[]> {
    const scope = await resolveVenueScope(ctx, args.organisationSlug, args.venueSlug);
    const links = await ctx.appDb.rls((tx) =>
      menuCatalogLinksRepo.listForVenue(tx, scope.venueId),
    );
    const menuIds = [...new Set(links.map((link) => link.menuItemId))];
    const nameById = await ctx.appDb.rls((tx) =>
      menuCatalogLinksRepo.getMenuItemNames(tx, menuIds),
    );

    return links.map((link) => ({
      id: link.id,
      menuItemId: link.menuItemId,
      squareCatalogObjectId: link.squareCatalogObjectId,
      menuItemName: nameById.get(link.menuItemId) ?? null,
    }));
  },

  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
      squareCatalogObjectId: string;
    },
  ): Promise<MenuCatalogLinkRow> {
    const scope = await resolveVenueScope(ctx, args.organisationSlug, args.venueSlug);
    assertOrgAdmin(ctx, scope.organisationId);

    const menuItemId = args.menuItemId.trim();
    const squareCatalogObjectId = args.squareCatalogObjectId.trim();
    if (!menuItemId || !squareCatalogObjectId) {
      throw new MenuCatalogLinksServiceError(
        400,
        "menuItemId and squareCatalogObjectId are required",
      );
    }

    const menuRow = await ctx.appDb.rls((tx) =>
      menuCatalogLinksRepo.getMenuItemForVenue(tx, {
        menuItemId,
        venueId: scope.venueId,
      }),
    );
    if (!menuRow) {
      throw new MenuCatalogLinksServiceError(404, "Menu line not found for this venue");
    }

    const nowIso = new Date().toISOString();
    try {
      const inserted = await ctx.appDb.rls((tx) =>
        menuCatalogLinksRepo.createLink(tx, {
          organisationId: menuRow.organisationId,
          venueId: scope.venueId,
          menuItemId,
          squareCatalogObjectId,
          updatedAt: nowIso,
        }),
      );
      if (!inserted) {
        throw new MenuCatalogLinksServiceError(500, "Could not create catalog link");
      }

      return {
        id: inserted.id,
        menuItemId: inserted.menuItemId,
        squareCatalogObjectId: inserted.squareCatalogObjectId,
        menuItemName: null,
      };
    } catch (error) {
      if (pgUniqueViolation(error)) {
        throw new MenuCatalogLinksServiceError(
          409,
          "This Square catalog object id is already linked for this venue",
        );
      }
      throw error;
    }
  },

  async delete(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; linkId: string },
  ): Promise<void> {
    const scope = await resolveVenueScope(ctx, args.organisationSlug, args.venueSlug);
    assertOrgAdmin(ctx, scope.organisationId);

    const linkId = args.linkId.trim();
    if (!linkId) {
      throw new MenuCatalogLinksServiceError(400, "Query param id is required");
    }

    await ctx.appDb.rls((tx) =>
      menuCatalogLinksRepo.deleteLink(tx, { linkId, venueId: scope.venueId }),
    );
  },
};
