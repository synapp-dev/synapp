"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import { CircleCheck, PackageSearch, Search, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { usePosCatalogImport } from "@/entities/pos-catalog-import/components/pos-catalog-import-provider";
import {
  isRecipeReady,
  PosItemDetailSheet,
  recipeReadinessLabel,
  UNMAPPED_RECIPE_VALUE,
} from "@/entities/pos-catalog-import/components/pos-item-detail-sheet";
import {
  formatPrice,
  GpPill,
} from "@/entities/pos-catalog-import/components/pos-line-metrics";
import { posCatalogImportApi } from "@/entities/pos-catalog-import/api/endpoints";
import type { PosCatalogImportRow } from "@/entities/pos-catalog-import/model/types";
import { usePosCatalogImportQuery } from "@/entities/pos-catalog-import/model/usePosCatalogImportQuery";
import { useRecipesQuery } from "@/entities/recipes/model/useRecipesQuery";
import { useVenueSquareConnectionQuery } from "@/entities/square/model/use-venue-square-connection";
import { SquareLocationPicker } from "@/entities/square/components/square-location-picker";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";

import { SmartFillRecipesButton } from "@/entities/pos-catalog-import/components/smart-fill-recipes-button";
import { isInventorySetupSectionsUnlockedForDev } from "@/lib/inventory-setup/dev-unlock-all-sections";
import { useQueryClient } from "@tanstack/react-query";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";

type RowFilter = "all" | "inUse" | "unmapped" | "flagged";

/** An item (Square item group) inside a category: name shown once, then its sellable lines. */
type PosItemGroup = {
  key: string;
  /** Null for loose lines with no item group: each row renders with its own name. */
  title: string | null;
  description: string | null;
  rows: PosCatalogImportRow[];
};

/** A POS category (PANINI, COFFEE, …): the big card. */
type PosSection = {
  key: string;
  name: string;
  groups: PosItemGroup[];
};

function groupPosSections(rows: PosCatalogImportRow[]): PosSection[] {
  const sections = new Map<string, PosSection>();
  const sectionOrder: string[] = [];
  const groupIndex = new Map<string, PosItemGroup>();
  for (const row of rows) {
    const sectionKey = row.sectionName;
    let section = sections.get(sectionKey);
    if (!section) {
      section = { key: sectionKey, name: row.sectionName, groups: [] };
      sections.set(sectionKey, section);
      sectionOrder.push(sectionKey);
    }
    const groupKey = `${sectionKey}::${row.groupId ?? `line:${row.menuItemId}`}`;
    let group = groupIndex.get(groupKey);
    if (!group) {
      group = {
        key: groupKey,
        title: row.groupId ? row.groupName : null,
        description: row.groupId ? row.description : null,
        rows: [],
      };
      groupIndex.set(groupKey, group);
      section.groups.push(group);
    }
    group.rows.push(row);
  }
  return sectionOrder.map((key) => sections.get(key)!);
}

/**
 * Variation label inside an item card: drop the redundant item-name prefix
 * ("FREE ICED COFFEE MG — ICED CHAI" reads as "ICED CHAI"). Null when the line
 * is just the item itself, so the name is not repeated.
 */
function variationLabel(row: PosCatalogImportRow, groupTitle: string): string | null {
  if (row.name === groupTitle) return null;
  if (row.name.toUpperCase().startsWith(groupTitle.toUpperCase())) {
    const rest = row.name.slice(groupTitle.length).replace(/^\s*[—–:-]+\s*/, "");
    return rest.length > 0 ? rest : null;
  }
  return row.name;
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
  const router = useRouter();
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
  const [detailMenuItemId, setDetailMenuItemId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");

  const detailRow = useMemo(
    () => rows.find((row) => row.menuItemId === detailMenuItemId) ?? null,
    [rows, detailMenuItemId],
  );

  const filterCounts = useMemo(
    () => ({
      all: rows.length,
      inUse: rows.filter((row) => row.showOnMenu).length,
      unmapped: rows.filter((row) => row.showOnMenu && !row.recipeId).length,
      flagged: rows.filter((row) => row.staleInUse).length,
    }),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (rowFilter === "inUse" && !row.showOnMenu) return false;
      if (rowFilter === "unmapped" && (!row.showOnMenu || row.recipeId)) return false;
      if (rowFilter === "flagged" && !row.staleInUse) return false;
      if (!query) return true;
      return [row.name, row.groupName, row.sectionName, row.recipeName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [rows, search, rowFilter]);

  const sections = useMemo(() => groupPosSections(filteredRows), [filteredRows]);

  const inUseCount = summary?.inUseMenuItemCount ?? 0;
  const mappedCount = summary?.mappedInUseCount ?? 0;
  const mappedPercent =
    inUseCount > 0 ? Math.round((mappedCount / inUseCount) * 100) : 0;

  const recipeOptions = useMemo(
    () => [
      { value: UNMAPPED_RECIPE_VALUE, label: "Unmapped" },
      ...recipes.map((recipe) => ({ value: recipe.id, label: recipe.name })),
    ],
    [recipes],
  );

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

  function renderBadges(row: PosCatalogImportRow) {
    const showStatusBadge =
      !row.missingFromSquare && row.status.toLowerCase() !== "active";
    if (!row.missingFromSquare && !showStatusBadge && !row.staleInUse) return null;
    return (
      <>
        {row.missingFromSquare ? (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
          >
            Missing from Square
          </Badge>
        ) : null}
        {showStatusBadge ? (
          <Badge variant="secondary" className="text-xs">
            {row.status}
          </Badge>
        ) : null}
        {row.staleInUse ? (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
            title="In use but no sales in the last 30 days — open the item to review"
          >
            No recent sales
          </Badge>
        ) : null}
      </>
    );
  }

  function renderMetrics(row: PosCatalogImportRow) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="tabular-nums">
          <span className="text-muted-foreground">Price </span>
          <span className="font-medium">{formatPrice(row.priceCents)}</span>
        </span>
        <span className="tabular-nums">
          <span className="text-muted-foreground">Cost/serve </span>
          <span className="font-medium">
            {row.costPerServeCents !== null
              ? formatPrice(row.costPerServeCents)
              : "—"}
          </span>
        </span>
        <GpPill gpPercent={row.gpPercent} />
      </div>
    );
  }

  /** In-use switch on the far left of every line. */
  function renderInUseSwitch(row: PosCatalogImportRow) {
    return (
      <label
        className="flex shrink-0 cursor-pointer select-none flex-col items-center gap-1 pt-0.5"
        onClick={(event) => event.stopPropagation()}
      >
        <Switch
          checked={row.showOnMenu}
          disabled={!canWrite}
          onCheckedChange={(checked) =>
            void handleShowOnMenu(row.menuItemId, checked)
          }
          aria-label={`In use for ${row.name}`}
          className="data-[state=checked]:bg-[var(--brand-supersolt-primary)]"
        />
        <span className="text-muted-foreground text-[10px] font-medium">In use</span>
      </label>
    );
  }

  /** Green check = recipe ready; amber warning = missing or incomplete. */
  function renderReadinessIcon(row: PosCatalogImportRow) {
    return isRecipeReady(row) ? (
      <CircleCheck
        className="size-4 shrink-0 text-[var(--brand-supersolt-primary)]"
        aria-label={recipeReadinessLabel(row)}
      >
        <title>{recipeReadinessLabel(row)}</title>
      </CircleCheck>
    ) : (
      <TriangleAlert
        className="size-4 shrink-0 text-amber-500"
        aria-label={recipeReadinessLabel(row)}
      >
        <title>{recipeReadinessLabel(row)}</title>
      </TriangleAlert>
    );
  }

  function renderRightBadges(row: PosCatalogImportRow) {
    const ingredientCount = row.recipeIngredientCount ?? 0;
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {row.modifierListCount > 0 ? (
          <Badge variant="secondary" className="text-xs font-medium tabular-nums">
            Modifier {row.modifierListCount === 1 ? "List" : "Lists"} (
            {row.modifierListCount})
          </Badge>
        ) : null}
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-medium tabular-nums",
            isRecipeReady(row)
              ? "border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_45%,var(--border))] bg-[var(--brand-supersolt-primary)]/12 text-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_28%,#0f2417)] dark:text-[var(--brand-supersolt-primary)]"
              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          )}
          title={row.recipeName ? `Recipe: ${row.recipeName}` : recipeReadinessLabel(row)}
        >
          Ingredients ({ingredientCount})
        </Badge>
      </div>
    );
  }

  /** Whole line opens the detail sheet; inner controls stop propagation. */
  function rowClickProps(menuItemId: string) {
    return {
      role: "button" as const,
      tabIndex: 0,
      onClick: () => setDetailMenuItemId(menuItemId),
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setDetailMenuItemId(menuItemId);
        }
      },
    };
  }

  /** One sellable line: in-use switch far left, name + readiness + metrics, badges right. */
  function renderLine(
    row: PosCatalogImportRow,
    name: string | null,
    description: string | null,
  ) {
    return (
      <div className="flex items-center gap-3 lg:gap-5">
        {renderInUseSwitch(row)}
        <div className={cn("min-w-0 flex-1", !row.showOnMenu && "opacity-55")}>
          <div className="flex flex-wrap items-center gap-2 empty:hidden">
            {name ? <span className="truncate font-medium">{name}</span> : null}
            {renderReadinessIcon(row)}
            {renderBadges(row)}
          </div>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
          ) : null}
          <div className="mt-1.5">{renderMetrics(row)}</div>
        </div>
        {renderRightBadges(row)}
      </div>
    );
  }

  const filterTabs: { id: RowFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: filterCounts.all },
    { id: "inUse", label: "In use", count: filterCounts.inUse },
    { id: "unmapped", label: "Unmapped", count: filterCounts.unmapped },
    ...(filterCounts.flagged > 0 || rowFilter === "flagged"
      ? [{ id: "flagged" as const, label: "Flagged", count: filterCounts.flagged }]
      : []),
  ];

  return (
    <div className="space-y-5">
      {/* Hero: title, actions, and mapping progress in one brand-tinted card. */}
      <section
        className={cn(
          "relative overflow-hidden rounded-xl border p-5 sm:p-6",
          "border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_32%,var(--border))]",
          "bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_14%,var(--background))] via-background to-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_5%,var(--background))]",
          "dark:border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_26%,var(--border))] dark:from-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_8%,var(--card))] dark:via-card dark:to-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_3%,var(--card))]",
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">POS items</h2>
            <p className="text-muted-foreground text-sm">
              Import your Square item library, mark what is in use, and map each
              line to a recipe for costing and consumption.
            </p>
          </div>
          {canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              {summary?.posImportRan && isInventorySetupSectionsUnlockedForDev() ? (
                <SmartFillRecipesButton
                  organisation={organisationSlug}
                  venue={venueSlug}
                  rows={rows}
                />
              ) : null}
              {summary?.posImportRan &&
              rows.some((row) => row.showOnMenu && !row.missingFromSquare) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 bg-background/70 backdrop-blur"
                  onClick={() =>
                    router.push(
                      buildScopedPath(
                        organisationSlug,
                        venueSlug,
                        "settings/inventory-setup/products/wizard",
                      ),
                    )
                  }
                >
                  <Sparkles className="size-4" aria-hidden />
                  {rows.some(
                    (row) => row.showOnMenu && !row.recipeId && !row.missingFromSquare,
                  )
                    ? "Build recipes with AI"
                    : "Review recipes"}
                </Button>
              ) : null}
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
            </div>
          ) : null}
        </div>

        {summary?.posImportRan && rows.length > 0 ? (
          <div className="mt-5 space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium">
                {inUseCount === 0
                  ? "No in-use POS lines — toggle items on when they are sold at this venue."
                  : mappedCount >= inUseCount
                    ? "All in-use POS lines are mapped to recipes."
                    : `${mappedCount} of ${inUseCount} in-use lines mapped to recipes`}
              </span>
              {inUseCount > 0 ? (
                <span className="text-muted-foreground text-xs font-medium tabular-nums">
                  {mappedPercent}%
                </span>
              ) : null}
            </div>
            {inUseCount > 0 ? (
              <div
                role="progressbar"
                aria-valuenow={mappedCount}
                aria-valuemin={0}
                aria-valuemax={inUseCount}
                aria-label="In-use POS lines mapped to recipes"
                className="h-2 overflow-hidden rounded-full bg-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_20%,var(--muted))]"
              >
                <div
                  className="h-full rounded-full bg-[var(--brand-supersolt-primary)] transition-[width] duration-500 ease-out"
                  style={{ width: `${mappedPercent}%` }}
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="bg-background/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs">
                <span className="text-foreground font-semibold tabular-nums">
                  {rows.length}
                </span>{" "}
                lines
              </span>
              <span className="bg-background/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs">
                <span className="text-foreground font-semibold tabular-nums">
                  {filterCounts.inUse}
                </span>{" "}
                in use
              </span>
              <span className="bg-background/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs">
                <span className="text-foreground font-semibold tabular-nums">
                  {mappedCount}
                </span>{" "}
                mapped
              </span>
              {filterCounts.unmapped > 0 ? (
                <button
                  type="button"
                  onClick={() => setRowFilter("unmapped")}
                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
                >
                  <span className="font-semibold tabular-nums">
                    {filterCounts.unmapped}
                  </span>{" "}
                  to map
                </button>
              ) : null}
              {filterCounts.flagged > 0 ? (
                <button
                  type="button"
                  onClick={() => setRowFilter("flagged")}
                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
                >
                  <span className="font-semibold tabular-nums">
                    {filterCounts.flagged}
                  </span>{" "}
                  no recent sales
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {squareQuery.data && !squareQuery.data.connected ? (
        <div className="rounded-xl border border-dashed p-5 text-sm">
          <p className="text-muted-foreground">
            Connect Square in{" "}
            <Link
              href={integrationsHref}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Settings → Integrations
            </Link>{" "}
            before importing POS items.
          </p>
        </div>
      ) : squareQuery.data && !squareQuery.data.locationConfigured ? (
        <div className="rounded-xl border p-5">
          <SquareLocationPicker
            organisationSlug={organisationSlug}
            venueSlug={venueSlug}
            canManage={canManageSquare}
            variant="inline"
          />
        </div>
      ) : null}

      {listQuery.isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading POS items">
          {[0, 1, 2].map((index) => (
            <div key={index} className="overflow-hidden rounded-xl border">
              <div className="border-b px-4 py-3 sm:px-5">
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-4 px-4 py-4 sm:px-5">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
          <div className="bg-[var(--brand-supersolt-primary)]/15 text-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_30%,#0f2417)] dark:text-[var(--brand-supersolt-primary)] flex size-12 items-center justify-center rounded-full">
            <PackageSearch className="size-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {summary?.posImportRan
                ? "No sellable variations found"
                : "No POS items yet"}
            </p>
            <p className="text-muted-foreground mx-auto max-w-sm text-sm">
              {summary?.posImportRan
                ? "No sellable variations were found for this venue location."
                : "Run Import from Square to pull your item library into Supersolt."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar: search + status filter, replaces sideways table scanning. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search items, categories, recipes…"
                aria-label="Search POS items"
                className="bg-background pl-9"
              />
            </div>
            <div
              role="tablist"
              aria-label="Filter POS items"
              className="bg-muted/50 flex w-fit items-center gap-1 rounded-lg border p-1"
            >
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={rowFilter === tab.id}
                  onClick={() => setRowFilter(tab.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    rowFilter === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "ml-1.5 tabular-nums",
                      rowFilter === tab.id
                        ? "text-muted-foreground"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {sections.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-12 text-center text-sm">
              No items match{search.trim() ? ` “${search.trim()}”` : " this filter"}.
            </div>
          ) : (
            <div className="space-y-5">
              {sections.map((section) => {
                const sectionRows = section.groups.flatMap((group) => group.rows);
                const sectionInUse = sectionRows.filter((row) => row.showOnMenu);
                const sectionMapped = sectionInUse.filter((row) => row.recipeId);
                return (
                  <section
                    key={section.key}
                    className="bg-card overflow-hidden rounded-xl border shadow-sm"
                  >
                    {/* Category header: the big card the user scans by. */}
                    <header className="bg-muted/40 border-b px-4 py-3.5 sm:px-5">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full bg-[var(--brand-supersolt-primary)]"
                        />
                        <h3 className="text-sm font-semibold uppercase tracking-wider">
                          {section.name}
                        </h3>
                        <span className="text-muted-foreground text-xs">
                          {sectionRows.length}{" "}
                          {sectionRows.length === 1 ? "line" : "lines"}
                        </span>
                        {sectionInUse.length > 0 ? (
                          <span
                            className={cn(
                              "ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                              sectionMapped.length >= sectionInUse.length
                                ? "bg-[var(--brand-supersolt-primary)]/20 text-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_25%,#0f2417)] dark:bg-[var(--brand-supersolt-primary)]/12 dark:text-[var(--brand-supersolt-primary)]"
                                : "bg-amber-500/12 text-amber-700 dark:text-amber-400",
                            )}
                          >
                            {sectionMapped.length}/{sectionInUse.length} mapped
                          </span>
                        ) : null}
                      </div>
                    </header>

                    <div className="divide-y">
                      {section.groups.map((group) => {
                        if (!group.title) {
                          // Loose lines with no item group: each renders with its own name.
                          return group.rows.map((row) => (
                            <div
                              key={row.menuItemId}
                              {...rowClickProps(row.menuItemId)}
                              className={cn(
                                "hover:bg-muted/20 cursor-pointer px-4 py-4 transition-colors sm:px-5",
                                !row.showOnMenu && "bg-muted/10",
                              )}
                            >
                              {renderLine(row, row.name, row.description)}
                            </div>
                          ));
                        }

                        if (group.rows.length === 1) {
                          // Single line: item name + description once, everything on one card.
                          const row = group.rows[0]!;
                          return (
                            <div
                              key={group.key}
                              {...rowClickProps(row.menuItemId)}
                              className={cn(
                                "hover:bg-muted/20 cursor-pointer px-4 py-4 transition-colors sm:px-5",
                                !row.showOnMenu && "bg-muted/10",
                              )}
                            >
                              {renderLine(row, group.title, group.description)}
                            </div>
                          );
                        }

                        // Multi-variation item: name + description once, variations nested.
                        return (
                          <div key={group.key} className="px-4 py-4 sm:px-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{group.title}</span>
                            </div>
                            {group.description ? (
                              <p className="text-muted-foreground mt-0.5 text-sm">
                                {group.description}
                              </p>
                            ) : null}
                            <div className="border-muted mt-3 space-y-1 border-l-2 pl-2">
                              {group.rows.map((row) => (
                                <div
                                  key={row.menuItemId}
                                  {...rowClickProps(row.menuItemId)}
                                  className="hover:bg-muted/20 cursor-pointer rounded-md px-2 py-1.5 transition-colors"
                                >
                                  {renderLine(
                                    row,
                                    variationLabel(row, group.title!),
                                    null,
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <PosItemDetailSheet
        organisationSlug={organisationSlug}
        venueSlug={venueSlug}
        row={detailRow}
        open={detailMenuItemId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailMenuItemId(null);
          }
        }}
        canWrite={canWrite}
        recipeOptions={recipeOptions}
        onShowOnMenuChange={(menuItemId, showOnMenu) =>
          void handleShowOnMenu(menuItemId, showOnMenu)
        }
        onRecipeChange={(menuItemId, recipeId) =>
          void handleRecipeChange(menuItemId, recipeId)
        }
      />
    </div>
  );
}
