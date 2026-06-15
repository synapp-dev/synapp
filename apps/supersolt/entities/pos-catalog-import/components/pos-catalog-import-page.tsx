"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";

import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { usePosCatalogImport } from "@/entities/pos-catalog-import/components/pos-catalog-import-provider";
import { PosItemModifiersCell } from "@/entities/pos-catalog-import/components/pos-item-modifiers-cell";
import {
  PosRecipeCreateDrawer,
  type PosRecipeCreateTarget,
} from "@/entities/pos-catalog-import/components/pos-recipe-create-drawer";
import { posCatalogImportApi } from "@/entities/pos-catalog-import/api/endpoints";
import { buildRecipePrefillFromPosLine } from "@/entities/pos-catalog-import/model/recipe-prefill";
import type { PosCatalogImportRow } from "@/entities/pos-catalog-import/model/types";
import { usePosCatalogImportQuery } from "@/entities/pos-catalog-import/model/usePosCatalogImportQuery";
import { useRecipesQuery } from "@/entities/recipes/model/useRecipesQuery";
import { useVenueSquareConnectionQuery } from "@/entities/square/model/use-venue-square-connection";
import { SquareLocationPicker } from "@/entities/square/components/square-location-picker";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useQueryClient } from "@tanstack/react-query";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const POS_TABLE_COLUMN_COUNT = 8;
const CREATE_RECIPE_VALUE = "__create_new__";

type PosGroup = {
  key: string;
  title: string;
  category: string | null;
  description: string | null;
  rows: PosCatalogImportRow[];
};

function groupPosRows(rows: PosCatalogImportRow[]): PosGroup[] {
  const byKey = new Map<string, PosGroup>();
  const order: string[] = [];
  for (const row of rows) {
    const key = row.groupId ?? `section:${row.sectionName}`;
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        title: row.groupName ?? row.sectionName,
        category: row.groupName ? row.sectionName : null,
        description: row.description,
        rows: [],
      };
      byKey.set(key, group);
      order.push(key);
    }
    group.rows.push(row);
  }
  return order.map((key) => byKey.get(key)!);
}

export function PosCatalogImportPage({
  organisationSlug,
  venueSlug,
}: {
  organisationSlug: string;
  venueSlug: string;
}) {
  const access = useScopedSettingsAccess();
  const queryClient = useQueryClient();
  const listQuery = usePosCatalogImportQuery({ organisationSlug, venueSlug });
  const squareQuery = useVenueSquareConnectionQuery(organisationSlug, venueSlug);
  const recipesQuery = useRecipesQuery({
    organisationSlug,
    venueSlug,
    page: 1,
    pageSize: 500,
  });
  const { startImport, isImportInProgress } = usePosCatalogImport();

  const canWrite = access.canSeeSettingsNav;
  const canManageSquare = access.canSeeAwardRates;
  const integrationsHref = buildScopedPath(
    organisationSlug,
    venueSlug,
    "settings/integrations",
  );

  const recipes = recipesQuery.data?.recipes ?? [];
  const summary = listQuery.data?.summary;
  const rows = listQuery.data?.rows ?? [];
  const groups = useMemo(() => groupPosRows(rows), [rows]);
  const [createTarget, setCreateTarget] = useState<PosRecipeCreateTarget | null>(null);

  const mappingBanner = useMemo(() => {
    if (!summary?.posImportRan) return null;
    if (summary.inUseMenuItemCount === 0) {
      return "No in-use POS lines — toggle items on when they are sold at this venue.";
    }
    if (summary.mappedInUseCount >= summary.inUseMenuItemCount) {
      return "All in-use POS lines are mapped to recipes.";
    }
    return `${summary.mappedInUseCount} of ${summary.inUseMenuItemCount} in-use POS lines mapped to recipes`;
  }, [summary]);

  async function handleShowOnMenu(menuItemId: string, showOnMenu: boolean) {
    const { error } = await posCatalogImportApi.patch.showOnMenu({
      organisationSlug,
      venueSlug,
      menuItemId,
      showOnMenu,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: posCatalogImportKeys.list(organisationSlug, venueSlug),
    });
  }

  async function handleRecipeChange(menuItemId: string, recipeId: string | null) {
    const { error } = await posCatalogImportApi.put.recipe({
      organisationSlug,
      venueSlug,
      menuItemId,
      recipeId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: posCatalogImportKeys.list(organisationSlug, venueSlug),
    });
  }

  return (
    <div className="space-y-4">
      {mappingBanner ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          {mappingBanner}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>POS items</CardTitle>
            <CardDescription>
              Import your Square item library, mark what is in use, and map each line to a recipe
              for costing and consumption.
            </CardDescription>
          </div>
          {canWrite ? (
            <Button
              type="button"
              onClick={() => void startImport()}
              disabled={
                isImportInProgress ||
                !squareQuery.data?.connected ||
                !squareQuery.data?.locationConfigured ||
                listQuery.isLoading
              }
            >
              {isImportInProgress ? "Importing…" : "Import from Square"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {!squareQuery.data?.connected ? (
            <p className="text-muted-foreground text-sm">
              Connect Square in{" "}
              <Link href={integrationsHref} className="text-primary underline-offset-4 hover:underline">
                Settings → Integrations
              </Link>{" "}
              before importing POS items.
            </p>
          ) : !squareQuery.data.locationConfigured ? (
            <SquareLocationPicker
              organisationSlug={organisationSlug}
              venueSlug={venueSlug}
              canManage={canManageSquare}
              variant="inline"
            />
          ) : null}

          {listQuery.isLoading ? (
            <p className="text-muted-foreground text-sm" aria-busy="true">
              Loading POS items…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {summary?.posImportRan
                ? "No sellable variations found for this venue location."
                : "Run Import from Square to pull your item library."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost / serve</TableHead>
                  <TableHead>GP</TableHead>
                  <TableHead>In use</TableHead>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Modifiers</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <Fragment key={group.key}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={POS_TABLE_COLUMN_COUNT} className="py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{group.title}</span>
                          {group.category ? (
                            <Badge variant="outline" className="text-xs font-normal">
                              {group.category}
                            </Badge>
                          ) : null}
                        </div>
                        {group.description ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {group.description}
                          </p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {group.rows.map((row) => (
                      <TableRow key={row.menuItemId}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{formatPrice(row.priceCents)}</TableCell>
                        <TableCell>
                          {row.costPerServeCents !== null ? (
                            formatPrice(row.costPerServeCents)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.gpPercent !== null ? (
                            `${row.gpPercent}%`
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={row.showOnMenu}
                            disabled={!canWrite}
                            onCheckedChange={(checked) =>
                              void handleShowOnMenu(row.menuItemId, checked)
                            }
                            aria-label={`In use for ${row.name}`}
                          />
                        </TableCell>
                        <TableCell className="min-w-[12rem]">
                          <Select
                            value={row.recipeId ?? "none"}
                            disabled={!canWrite}
                            onValueChange={(value) => {
                              if (value === CREATE_RECIPE_VALUE) {
                                setCreateTarget({
                                  menuItemId: row.menuItemId,
                                  prefill: buildRecipePrefillFromPosLine(row),
                                });
                                return;
                              }
                              void handleRecipeChange(
                                row.menuItemId,
                                value === "none" ? null : value,
                              );
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Map recipe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unmapped</SelectItem>
                              <SelectItem value={CREATE_RECIPE_VALUE}>
                                + Create new recipe
                              </SelectItem>
                              {recipes.map((recipe) => (
                                <SelectItem key={recipe.id} value={recipe.id}>
                                  {recipe.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {row.recipeCostIncomplete ? (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                              Incomplete recipe — add ingredients to set cost
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <PosItemModifiersCell
                            organisationSlug={organisationSlug}
                            venueSlug={venueSlug}
                            menuItemId={row.menuItemId}
                            count={row.modifierListCount}
                          />
                        </TableCell>
                        <TableCell>
                          {row.missingFromSquare ? (
                            <Badge variant="outline" className="text-amber-700">
                              Missing from Square
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{row.status}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PosRecipeCreateDrawer
        organisationSlug={organisationSlug}
        venueSlug={venueSlug}
        target={createTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCreateTarget(null);
          }
        }}
      />
    </div>
  );
}
