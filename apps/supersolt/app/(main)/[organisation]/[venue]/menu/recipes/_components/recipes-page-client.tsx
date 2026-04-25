"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChefHat, CookingPot, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Input } from "@workspace/ui/components/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { Separator } from "@workspace/ui/components/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { useRecipeMutations } from "@/entities/recipes/model/useRecipeMutations";
import { useRecipeQuery } from "@/entities/recipes/model/useRecipeQuery";
import { useRecipesQuery } from "@/entities/recipes/model/useRecipesQuery";
import { useRecipesFilterStore } from "@/entities/recipes/model/store";
import type {
  RecipeSummary,
  UpsertRecipeInput,
} from "@/entities/recipes/model/types";
import {
  RECIPE_EDITOR_TABS,
  RecipeEditorDrawerContent,
  type RecipeEditorTab,
} from "./recipe-editor-drawer-content";

type RecipesPageClientProps = {
  organisation: string;
  venue: string;
};

type RecipeStatus = RecipeSummary["status"];

const CATEGORIES = [
  { value: "mains", label: "Mains" },
  { value: "sides", label: "Sides" },
  { value: "drinks", label: "Drinks" },
  { value: "desserts", label: "Desserts" },
  { value: "prep", label: "Prep" },
  { value: "other", label: "Other" },
];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function parseRecipeTabParam(value: string | null): RecipeEditorTab {
  if (value && RECIPE_EDITOR_TABS.includes(value as RecipeEditorTab)) {
    return value as RecipeEditorTab;
  }
  return "details";
}

function StatusIndicator({ status }: { status: RecipeStatus }) {
  switch (status) {
    case "published":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Published
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Draft
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Archived
        </span>
      );
    default: {
      const neverStatus: never = status;
      return neverStatus;
    }
  }
}

export function RecipesPageClient({ organisation, venue }: RecipesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<RecipeEditorTab>("details");

  const search = useRecipesFilterStore((state) => state.search);
  const category = useRecipesFilterStore((state) => state.category);
  const status = useRecipesFilterStore((state) => state.status);
  const page = useRecipesFilterStore((state) => state.page);
  const pageSize = useRecipesFilterStore((state) => state.pageSize);
  const setSearch = useRecipesFilterStore((state) => state.setSearch);
  const setCategory = useRecipesFilterStore((state) => state.setCategory);
  const setStatus = useRecipesFilterStore((state) => state.setStatus);
  const setPage = useRecipesFilterStore((state) => state.setPage);
  const setPageSize = useRecipesFilterStore((state) => state.setPageSize);
  const resetFilters = useRecipesFilterStore((state) => state.reset);

  const recipesQuery = useRecipesQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    search: search.trim() || undefined,
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
    page,
    pageSize,
  });

  const { createRecipe, updateRecipe, deleteRecipe } = useRecipeMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const selectedRecipeId = searchParams.get("id");
  const isRecipeDrawerOpen = selectedRecipeId !== null;
  const recipeDetailQuery = useRecipeQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    recipeId: selectedRecipeId,
  });

  const recipes = recipesQuery.data?.recipes;
  const totalItems = recipesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const visibleStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleEnd = totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, setPage, totalPages]);

  const removeRecipeQueryParams = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("id");
    nextParams.delete("tab");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  const openRecipeInSheet = useCallback(
    (recipe: RecipeSummary, tab: RecipeEditorTab = "details") => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("id", recipe.id);
      nextParams.set("tab", tab);
      router.replace(`${pathname}?${nextParams.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const selectedRecipeSummary = useMemo(
    () => (recipes ?? []).find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [recipes, selectedRecipeId]
  );

  const hasActiveFilters =
    search.trim().length > 0 || category !== "all" || status !== "all";
  const isDrawerOpen = isCreateDrawerOpen || isRecipeDrawerOpen;

  function clearFilters() {
    resetFilters();
  }

  function openRecipeDrawer(recipe: RecipeSummary) {
    setIsCreateDrawerOpen(false);
    setActiveTab("details");
    openRecipeInSheet(recipe, "details");
  }

  function openNewRecipeDrawer() {
    setIsCreateDrawerOpen(true);
    setActiveTab("details");
    removeRecipeQueryParams();
  }

  function handleDrawerOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      return;
    }
    setIsCreateDrawerOpen(false);
    setActiveTab("details");
    removeRecipeQueryParams();
  }

  function handleActiveTabChange(nextTab: RecipeEditorTab) {
    setActiveTab(nextTab);
    if (isRecipeDrawerOpen && selectedRecipeSummary) {
      openRecipeInSheet(selectedRecipeSummary, nextTab);
    }
  }

  async function handleSaveRecipe(payload: UpsertRecipeInput) {
    if (isCreateDrawerOpen || !selectedRecipeId) {
      const created = await createRecipe.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        payload,
      });
      setIsCreateDrawerOpen(false);
      setActiveTab("details");
      openRecipeInSheet(created, "details");
      return;
    }

    await updateRecipe.mutateAsync({
      organisationSlug: organisation,
      venueSlug: venue,
      recipeId: selectedRecipeId,
      payload,
    });
  }

  async function handleDeleteRecipe(recipeId: string) {
    await deleteRecipe.mutateAsync({
      organisationSlug: organisation,
      venueSlug: venue,
      recipeId,
    });
    setIsCreateDrawerOpen(false);
    setActiveTab("details");
    removeRecipeQueryParams();
  }

  useEffect(() => {
    if (!isRecipeDrawerOpen) {
      if (!isCreateDrawerOpen) {
        setActiveTab("details");
      }
      return;
    }

    const tabParam = searchParams.get("tab");
    const parsedTab = parseRecipeTabParam(tabParam);
    setActiveTab(parsedTab);

    if (!tabParam && selectedRecipeSummary) {
      openRecipeInSheet(selectedRecipeSummary, parsedTab);
    }
  }, [isCreateDrawerOpen, isRecipeDrawerOpen, openRecipeInSheet, searchParams, selectedRecipeSummary]);

  useEffect(() => {
    if (!selectedRecipeId) {
      return;
    }
    if (!recipesQuery.isLoading && !selectedRecipeSummary) {
      removeRecipeQueryParams();
    }
  }, [recipesQuery.isLoading, removeRecipeQueryParams, selectedRecipeId, selectedRecipeSummary]);

  return (
    <>
      <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CookingPot className="h-5 w-5 text-muted-foreground" />
            Items
          </h1>
        </div>
        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-[480px] max-w-full pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {isHydrated ? (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 w-[150px] rounded-md border bg-background" />
              )}
              {isHydrated ? (
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 w-[130px] rounded-md border bg-background" />
              )}
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <Card className="flex-1 overflow-hidden gap-0 py-0">
          <CardContent className="flex h-full min-h-0 flex-col px-0 py-0">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="pl-6 text-xs font-medium uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">Category</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">Servings</TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wider">
                      Cost/Serve
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wider">
                      Sell Price
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wider">
                      GP %
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    className="cursor-pointer bg-[#bcdc88]/20 opacity-0 hover:bg-[#bcdc88]/50 animate-slide-up-fade-in"
                    style={{ animationDelay: "0.04s", animationFillMode: "forwards" }}
                    onClick={openNewRecipeDrawer}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50">
                          <Plus className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium">Add new item</span>
                      </div>
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                  </TableRow>

                  {recipesQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Loading items...
                      </TableCell>
                    </TableRow>
                  ) : (recipes ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No items found. Adjust filters or add a new item.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (recipes ?? []).map((recipe, index) => {
                      const gpColor =
                        recipe.gpPercent >= 65
                          ? "text-emerald-600 dark:text-emerald-400"
                          : recipe.gpPercent >= 55
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-500 dark:text-red-400";

                      return (
                        <TableRow
                          key={recipe.id}
                          className="cursor-pointer opacity-0 hover:bg-muted/50 animate-slide-up-fade-in"
                          style={{
                            animationDelay: `${(0.04 + (index + 1) * 0.04).toFixed(2)}s`,
                            animationFillMode: "forwards",
                          }}
                          onClick={() => openRecipeDrawer(recipe)}
                        >
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <ChefHat className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <span className="font-medium">{recipe.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {categoryLabel(recipe.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">{recipe.serves}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(recipe.costPerServe)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {recipe.suggestedPrice > 0 ? formatCurrency(recipe.suggestedPrice) : "-"}
                          </TableCell>
                          <TableCell className={cn("text-right font-semibold tabular-nums", gpColor)}>
                            {recipe.gpPercent > 0 ? `${Math.round(recipe.gpPercent)}%` : "-"}
                          </TableCell>
                          <TableCell>
                            <StatusIndicator status={recipe.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-xs text-muted-foreground">
            {`Showing ${visibleStart}-${visibleEnd} of ${totalItems}`}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page:</span>
              {isHydrated ? (
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="h-8 w-[88px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-8 w-[88px] rounded-md border bg-background" />
              )}
            </div>
            <Pagination className="!mx-0 !w-auto !justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(Math.max(1, page - 1));
                    }}
                    className={cn(page <= 1 && "pointer-events-none opacity-50")}
                    aria-disabled={page <= 1}
                  />
                </PaginationItem>
                {page > 3 ? (
                  <>
                    <PaginationItem>
                      <PaginationLink href="#" onClick={(event) => {
                        event.preventDefault();
                        setPage(1);
                      }}>
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {page > 4 ? (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : null}
                  </>
                ) : null}
                {page > 1 ? (
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(event) => {
                      event.preventDefault();
                      setPage(page - 1);
                    }}>
                      {page - 1}
                    </PaginationLink>
                  </PaginationItem>
                ) : null}
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {page}
                  </PaginationLink>
                </PaginationItem>
                {page + 1 < totalPages ? (
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(event) => {
                      event.preventDefault();
                      setPage(page + 1);
                    }}>
                      {page + 1}
                    </PaginationLink>
                  </PaginationItem>
                ) : null}
                {page + 1 < totalPages - 1 ? (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : null}
                {page + 1 < totalPages ? (
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(event) => {
                      event.preventDefault();
                      setPage(totalPages);
                    }}>
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                ) : null}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(Math.min(totalPages, page + 1));
                    }}
                    className={cn(page >= totalPages && "pointer-events-none opacity-50")}
                    aria-disabled={page >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </section>

      <Sheet open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <SheetContent
          side={isCreateDrawerOpen ? "top" : "bottom"}
          className={cn(
            "inset-x-1/2 right-auto flex w-full max-w-2xl -translate-x-1/2 flex-col overflow-hidden border md:w-[50vw]",
            isCreateDrawerOpen
              ? "top-0 bottom-14 rounded-t-none rounded-b-xl"
              : "top-14 bottom-0 rounded-t-xl"
          )}
        >
          <SheetTitle className="sr-only">
            {selectedRecipeSummary ? `Edit item: ${selectedRecipeSummary.name}` : "Create item"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {selectedRecipeSummary
              ? "Edit item details, ingredients, method, allergens, and costing."
              : "Create a new catalog item with details, ingredients, method, allergens, and costing."}
          </SheetDescription>
          <RecipeEditorDrawerContent
            organisation={organisation}
            venue={venue}
            recipe={isCreateDrawerOpen ? null : recipeDetailQuery.data ?? null}
            activeTab={activeTab}
            onActiveTabChange={handleActiveTabChange}
            onClose={() => handleDrawerOpenChange(false)}
            isSaving={createRecipe.isPending || updateRecipe.isPending || deleteRecipe.isPending}
            onDelete={handleDeleteRecipe}
            onSave={handleSaveRecipe}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
