"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { useIngredientMutations } from "@/entities/ingredients/model/useIngredientMutations";
import { useIngredientsQuery } from "@/entities/ingredients/model/useIngredientsQuery";
import { useIngredientsFilterStore } from "@/entities/ingredients/model/store";
import { useSuppliersQuery } from "@/entities/suppliers/model/useSuppliersQuery";
import type {
  IngredientCategory,
  IngredientStatus,
  IngredientSummary,
  UpsertIngredientInput,
} from "@/entities/ingredients/model/types";

type IngredientsPageClientProps = {
  organisation: string;
  venue: string;
};

const CATEGORIES: Array<{ value: IngredientCategory; label: string }> = [
  { value: "proteins", label: "Proteins" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "dry-goods", label: "Dry Goods" },
  { value: "beverages", label: "Beverages" },
  { value: "oils-condiments", label: "Oils & Condiments" },
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

function StatusBadge({ status }: { status: IngredientStatus }) {
  switch (status) {
    case "active":
      return <Badge variant="default">Active</Badge>;
    case "inactive":
      return <Badge variant="secondary">Inactive</Badge>;
    default: {
      const neverStatus: never = status;
      return neverStatus;
    }
  }
}

function toIngredientPayload(ingredient: IngredientSummary): UpsertIngredientInput {
  return {
    name: ingredient.name,
    category: ingredient.category,
    unit: ingredient.unit,
    costPerUnitCents: ingredient.costPerUnitCents,
    bestSupplierCostCents: ingredient.bestSupplierCostCents,
    currentStockLevel: ingredient.currentStockLevel,
    status: ingredient.status,
    supplierId: ingredient.supplierId,
  };
}

function createDefaultIngredient(): UpsertIngredientInput {
  return {
    name: "",
    category: "other",
    unit: "ea",
    costPerUnitCents: 0,
    bestSupplierCostCents: null,
    currentStockLevel: 0,
    status: "active",
    supplierId: null,
  };
}

function formatInputCurrency(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function IngredientsPageClient({ organisation, venue }: IngredientsPageClientProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<IngredientSummary | null>(null);
  const [form, setForm] = useState<UpsertIngredientInput>(createDefaultIngredient);
  const [costInput, setCostInput] = useState("0.00");
  const [bestCostInput, setBestCostInput] = useState("");

  const search = useIngredientsFilterStore((state) => state.search);
  const category = useIngredientsFilterStore((state) => state.category);
  const status = useIngredientsFilterStore((state) => state.status);
  const page = useIngredientsFilterStore((state) => state.page);
  const pageSize = useIngredientsFilterStore((state) => state.pageSize);
  const setSearch = useIngredientsFilterStore((state) => state.setSearch);
  const setCategory = useIngredientsFilterStore((state) => state.setCategory);
  const setStatus = useIngredientsFilterStore((state) => state.setStatus);
  const setPage = useIngredientsFilterStore((state) => state.setPage);
  const setPageSize = useIngredientsFilterStore((state) => state.setPageSize);
  const resetFilters = useIngredientsFilterStore((state) => state.reset);

  const ingredientsQuery = useIngredientsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    search: search.trim() || undefined,
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
    page,
    pageSize,
  });

  const suppliersQuery = useSuppliersQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    status: "active",
    page: 1,
    pageSize: 200,
  });

  const { createIngredient, updateIngredient, deleteIngredient } =
    useIngredientMutations({
      organisationSlug: organisation,
      venueSlug: venue,
    });

  const ingredients = ingredientsQuery.data?.ingredients ?? [];
  const totalItems = ingredientsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const visibleStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleEnd = totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize);
  const hasActiveFilters =
    search.trim().length > 0 || category !== "all" || status !== "all";

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, setPage, totalPages]);

  function clearFilters() {
    resetFilters();
  }

  function openCreateSheet() {
    setEditingIngredient(null);
    const nextForm = createDefaultIngredient();
    setForm(nextForm);
    setCostInput(formatInputCurrency(nextForm.costPerUnitCents));
    setBestCostInput("");
    setSheetMode("create");
  }

  function openEditSheet(ingredient: IngredientSummary) {
    setEditingIngredient(ingredient);
    const nextForm = toIngredientPayload(ingredient);
    setForm(nextForm);
    setCostInput(formatInputCurrency(nextForm.costPerUnitCents));
    const bestCents = nextForm.bestSupplierCostCents;
    setBestCostInput(typeof bestCents === "number" ? formatInputCurrency(bestCents) : "");
    setSheetMode("edit");
  }

  async function handleSave() {
    const payload: UpsertIngredientInput = {
      ...form,
      name: form.name.trim(),
      costPerUnitCents: Math.max(0, Math.round((Number(costInput) || 0) * 100)),
      bestSupplierCostCents:
        bestCostInput.trim().length === 0
          ? null
          : Math.max(0, Math.round((Number(bestCostInput) || 0) * 100)),
      currentStockLevel: Math.max(0, Number(form.currentStockLevel) || 0),
      supplierId: form.supplierId ?? null,
    };

    if (!payload.name) {
      toast.error("Ingredient name is required");
      return;
    }

    if (sheetMode === "create") {
      await createIngredient.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        payload,
      });
      toast.success("Ingredient created");
    } else if (sheetMode === "edit" && editingIngredient) {
      await updateIngredient.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        ingredientId: editingIngredient.id,
        payload,
      });
      toast.success("Ingredient updated");
    }

    setSheetMode(null);
    setEditingIngredient(null);
  }

  async function handleDeleteFromSheet() {
    if (!editingIngredient) {
      return;
    }
    if (!confirm(`Delete ${editingIngredient.name}? This action cannot be undone.`)) {
      return;
    }

    await deleteIngredient.mutateAsync({
      organisationSlug: organisation,
      venueSlug: venue,
      ingredientId: editingIngredient.id,
    });

    setSheetMode(null);
    setEditingIngredient(null);
    toast.success("Ingredient deleted");
  }

  return (
    <>
      <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Package className="h-5 w-5 text-muted-foreground" />
            Ingredients
          </h1>
        </div>
        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ingredients..."
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
                  <SelectTrigger className="h-9 w-[160px]">
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
                <div className="h-9 w-[160px] rounded-md border bg-background" />
              )}

              {isHydrated ? (
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 w-[130px] rounded-md border bg-background" />
              )}

              {hasActiveFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={clearFilters}
                >
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
                    <TableHead className="text-xs font-medium uppercase tracking-wider">Unit</TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wider">
                      Cost/Unit
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wider">
                      Stock Level
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    className="cursor-pointer bg-[#bcdc88]/20 hover:bg-[#bcdc88]/50"
                    onClick={openCreateSheet}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/5">
                          <Plus className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium">Add new ingredient</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                  </TableRow>

                  {ingredientsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Loading ingredients...
                      </TableCell>
                    </TableRow>
                  ) : ingredients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        No ingredients found. Adjust filters or add a new ingredient.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ingredients.map((ingredient) => (
                      <TableRow
                        key={ingredient.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openEditSheet(ingredient)}
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Package className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="font-medium">{ingredient.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabel(ingredient.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ingredient.unit}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-medium tabular-nums">
                              {formatCurrency(ingredient.costPerUnitCents)}
                            </span>
                            {ingredient.bestSupplierCostCents !== null ? (
                              <Badge variant="outline" className="text-[10px]">
                                Best: {formatCurrency(ingredient.bestSupplierCostCents)}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {ingredient.currentStockLevel.toFixed(2)} {ingredient.unit}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ingredient.status} />
                        </TableCell>
                      </TableRow>
                    ))
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
                      <PaginationLink
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(1);
                        }}
                      >
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
                    <PaginationLink
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(page - 1);
                      }}
                    >
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
                    <PaginationLink
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(page + 1);
                      }}
                    >
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
                    <PaginationLink
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(totalPages);
                      }}
                    >
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

      <Sheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSheetMode(null);
            setEditingIngredient(null);
          }
        }}
      >
        <SheetContent
          side={sheetMode === "create" ? "top" : "bottom"}
          className={cn(
            "inset-x-1/2 right-auto flex w-full max-w-2xl -translate-x-1/2 flex-col overflow-hidden border md:w-[50vw]",
            sheetMode === "create"
              ? "top-0 bottom-14 rounded-t-none rounded-b-xl"
              : "top-14 bottom-0 rounded-t-xl"
          )}
        >
          <SheetTitle className="sr-only">
            {sheetMode === "create"
              ? "Create ingredient"
              : `Edit ingredient: ${editingIngredient?.name ?? "ingredient"}`}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {sheetMode === "create"
              ? "Create a new ingredient."
              : "Edit ingredient details and status."}
          </SheetDescription>

          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">
                    {sheetMode === "create" ? "New Ingredient" : form.name || "Ingredient Editor"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {sheetMode === "create"
                      ? "Create ingredient details."
                      : "Edit ingredient details in-place."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {sheetMode === "edit" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void handleDeleteFromSheet()}
                      disabled={deleteIngredient.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => void handleSave()}
                    disabled={createIngredient.isPending || updateIngredient.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={form.category}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          category: value as IngredientCategory,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((categoryItem) => (
                          <SelectItem key={categoryItem.value} value={categoryItem.value}>
                            {categoryItem.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit</label>
                    <Input
                      value={form.unit}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, unit: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          status: value as IngredientStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Supplier</label>
                    <Select
                      value={form.supplierId ?? "__none"}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          supplierId: value === "__none" ? null : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">No supplier</SelectItem>
                        {(suppliersQuery.data?.suppliers ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cost / Unit (A$)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={costInput}
                      onChange={(event) => setCostInput(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Best Supplier Cost (A$)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={bestCostInput}
                      placeholder="Optional"
                      onChange={(event) => setBestCostInput(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Stock Level</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.currentStockLevel}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          currentStockLevel: Number(event.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
