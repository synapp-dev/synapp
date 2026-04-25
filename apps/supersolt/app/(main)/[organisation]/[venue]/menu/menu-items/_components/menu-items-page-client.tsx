"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenText,
  Download,
  Eye,
  EyeOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useMenuItemMutations } from "@/entities/menu-items/model/useMenuItemMutations";
import { useMenuItemQuery } from "@/entities/menu-items/model/useMenuItemQuery";
import { useMenuItemsQuery } from "@/entities/menu-items/model/useMenuItemsQuery";
import { useMenuItemsFilterStore } from "@/entities/menu-items/model/store";
import type {
  MenuItemDetail,
  MenuItemGstMode,
  MenuItemPriceMode,
  MenuItemStatus,
  MenuItemSummary,
  UpsertMenuItemInput,
} from "@/entities/menu-items/model/types";
import { useRecipesQuery } from "@/entities/recipes/model/useRecipesQuery";

type MenuItemsPageClientProps = {
  organisation: string;
  venue: string;
};

const TARGET_GP_PERCENT = 65;

type MenuItemForm = UpsertMenuItemInput;

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseDollarsToCents(value: string): number {
  return Math.max(0, Math.round((Number(value) || 0) * 100));
}

function getGpColor(gpPercent: number): string {
  if (gpPercent >= TARGET_GP_PERCENT) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (gpPercent >= TARGET_GP_PERCENT - 10) {
    return "text-amber-600 dark:text-amber-400";
  }
  return "text-red-600 dark:text-red-400";
}

function computeGpPercent(priceCents: number, costPerServeCents: number): number {
  if (priceCents <= 0) {
    return 0;
  }
  return ((priceCents - costPerServeCents) / priceCents) * 100;
}

function createEmptyForm(sectionName: string): MenuItemForm {
  return {
    sectionName: sectionName || "General",
    name: "",
    tags: [],
    priceMode: "MANUAL",
    priceCents: 0,
    gstMode: "INC",
    pluCode: "",
    showOnMenu: true,
    status: "active",
    components: [],
  };
}

function detailToForm(detail: MenuItemDetail): MenuItemForm {
  return {
    sectionName: detail.sectionName,
    name: detail.name,
    tags: detail.tags,
    priceMode: detail.priceMode,
    priceCents: detail.priceCents,
    gstMode: detail.gstMode,
    pluCode: detail.pluCode,
    showOnMenu: detail.showOnMenu,
    status: detail.status,
    components: detail.components.map((component) => ({
      recipeId: component.recipeId,
      quantity: component.quantity,
    })),
  };
}

export function MenuItemsPageClient({ organisation, venue }: MenuItemsPageClientProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | null>(null);
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [localSections, setLocalSections] = useState<string[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuItemForm>(() => createEmptyForm("General"));
  const [priceInput, setPriceInput] = useState("0.00");
  const [tagsInput, setTagsInput] = useState("");

  const search = useMenuItemsFilterStore((state) => state.search);
  const sectionName = useMenuItemsFilterStore((state) => state.sectionName);
  const page = useMenuItemsFilterStore((state) => state.page);
  const pageSize = useMenuItemsFilterStore((state) => state.pageSize);
  const setSearch = useMenuItemsFilterStore((state) => state.setSearch);
  const setSectionName = useMenuItemsFilterStore((state) => state.setSectionName);
  const setPage = useMenuItemsFilterStore((state) => state.setPage);
  const setPageSize = useMenuItemsFilterStore((state) => state.setPageSize);

  const menuItemsQuery = useMenuItemsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    search: search.trim() || undefined,
    sectionName: sectionName === "all" ? undefined : sectionName,
    page,
    pageSize,
  });

  const menuItemDetailQuery = useMenuItemQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    menuItemId: selectedMenuItemId,
  });

  const recipesQuery = useRecipesQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    page: 1,
    pageSize: 200,
  });

  const recipes = useMemo(() => recipesQuery.data?.recipes ?? [], [recipesQuery.data?.recipes]);
  const recipeCostMap = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe.costPerServe] as const)),
    [recipes]
  );

  const { createMenuItem, updateMenuItem, deleteMenuItem } = useMenuItemMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const menuItems = useMemo(
    () => menuItemsQuery.data?.menuItems ?? [],
    [menuItemsQuery.data?.menuItems]
  );
  const totalItems = menuItemsQuery.data?.total ?? 0;
  const sections = menuItemsQuery.data?.sections ?? [];
  const allSections = useMemo(() => {
    const merged = [...sections];
    for (const localSection of localSections) {
      if (!merged.some((section) => section.toLowerCase() === localSection.toLowerCase())) {
        merged.push(localSection);
      }
    }
    return merged;
  }, [localSections, sections]);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const visibleStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleEnd = totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize);
  const isShowingAll = pageSize === -1;

  const pagedItems = isShowingAll ? menuItems : menuItems;

  const computedCostPerServe = useMemo(() => {
    return Math.round(
      form.components.reduce((sum, component) => {
        const recipeCost = recipeCostMap.get(component.recipeId) ?? 0;
        return sum + recipeCost * component.quantity;
      }, 0)
    );
  }, [form.components, recipeCostMap]);

  const computedGpPercent = useMemo(
    () => computeGpPercent(form.priceCents, computedCostPerServe),
    [computedCostPerServe, form.priceCents]
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, setPage, totalPages]);

  useEffect(() => {
    if (sheetMode !== "edit" || !menuItemDetailQuery.data) {
      return;
    }

    const next = detailToForm(menuItemDetailQuery.data);
    setForm(next);
    setPriceInput(formatDollars(next.priceCents));
    setTagsInput(next.tags.join(", "));
  }, [menuItemDetailQuery.data, sheetMode]);

  function openCreateSheet() {
    const section =
      sectionName !== "all"
        ? sectionName
        : (allSections[0] ?? "General");
    const next = createEmptyForm(section);
    setForm(next);
    setPriceInput(formatDollars(next.priceCents));
    setTagsInput("");
    setSelectedMenuItemId(null);
    setSheetMode("create");
  }

  function createSection() {
    const normalized = newSectionName.trim();
    if (!normalized) {
      toast.error("Section name is required");
      return;
    }

    const exists = allSections.some(
      (section) => section.toLowerCase() === normalized.toLowerCase()
    );
    if (exists) {
      toast.error("That section already exists");
      return;
    }

    setLocalSections((current) => [...current, normalized]);
    setSectionName(normalized);
    setNewSectionName("");
    setIsAddSectionDialogOpen(false);
    toast.success("Section created");
  }

  function openEditSheet(item: MenuItemSummary) {
    setSelectedMenuItemId(item.id);
    setSheetMode("edit");
  }

  function addComponentRow() {
    setForm((current) => ({
      ...current,
      components: [...current.components, { recipeId: "", quantity: 1 }],
    }));
  }

  function removeComponentRow(index: number) {
    setForm((current) => ({
      ...current,
      components: current.components.filter((_, componentIndex) => componentIndex !== index),
    }));
  }

  function updateComponentRow(
    index: number,
    patch: Partial<{ recipeId: string; quantity: number }>
  ) {
    setForm((current) => {
      const nextComponents = [...current.components];
      const target = nextComponents[index];
      if (!target) {
        return current;
      }
      nextComponents[index] = { ...target, ...patch };
      return { ...current, components: nextComponents };
    });
  }

  async function saveMenuItem() {
    const payload: UpsertMenuItemInput = {
      ...form,
      name: form.name.trim(),
      sectionName: form.sectionName.trim(),
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      priceCents: parseDollarsToCents(priceInput),
      components: form.components.filter(
        (component) => component.recipeId && component.quantity > 0
      ),
    };

    if (!payload.name) {
      toast.error("Name is required");
      return;
    }
    if (!payload.sectionName) {
      toast.error("Section is required");
      return;
    }
    if (payload.components.length === 0) {
      toast.error("Add at least one catalog item component");
      return;
    }

    if (sheetMode === "create") {
      await createMenuItem.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        payload,
      });
      toast.success("Added to menu");
    } else if (sheetMode === "edit" && selectedMenuItemId) {
      await updateMenuItem.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        menuItemId: selectedMenuItemId,
        payload,
      });
      toast.success("Menu updated");
    }

    setSheetMode(null);
    setSelectedMenuItemId(null);
  }

  async function deleteCurrentMenuItem() {
    if (!selectedMenuItemId || sheetMode !== "edit") {
      return;
    }
    if (!confirm("Delete this from the menu? This action cannot be undone.")) {
      return;
    }

    await deleteMenuItem.mutateAsync({
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId: selectedMenuItemId,
    });
    toast.success("Removed from menu");
    setSheetMode(null);
    setSelectedMenuItemId(null);
  }

  const selectedSectionItemsCount = useMemo(() => {
    if (sectionName === "all") {
      return totalItems;
    }
    return menuItems.filter((item) => item.sectionName === sectionName).length;
  }, [menuItems, sectionName, totalItems]);

  return (
    <>
      <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BookOpenText className="h-5 w-5 text-muted-foreground" />
            Menu
          </h1>
        </div>
        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, catalog item, PLU, tag..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-[480px] max-w-full pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => toast.info("Coming soon")}>
              <Download className="h-4 w-4" />
              Export Menu
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-0">
          <div className="flex w-fit max-w-full gap-1 overflow-x-auto bg-transparent">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-fit gap-2 rounded-b-none border border-b-0 border-transparent bg-transparent px-4 py-2 text-lg font-medium text-muted-foreground hover:bg-transparent"
                  onClick={() => setIsAddSectionDialogOpen(true)}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-dotted">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Add New Section</TooltipContent>
            </Tooltip>

            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-auto w-fit gap-2 rounded-b-none px-6 py-2 text-lg font-medium justify-between flex",
                sectionName === "all"
                  ? "border border-b-0 bg-muted/50 text-foreground hover:bg-muted/50"
                  : "border border-b-0 border-transparent bg-transparent text-muted-foreground hover:bg-transparent"
              )}
              onClick={() => setSectionName("all")}
            >
              <span>All</span>
              <Badge variant="secondary" className="h-5 min-w-5 rounded-sm px-1.5 text-[10px] tabular-nums">
                {totalItems}
              </Badge>
            </Button>

            {allSections.map((section) => (
              <Button
                key={section}
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto w-fit gap-2 rounded-b-none px-6 py-2 text-lg font-medium justify-between flex",
                  sectionName === section
                    ? "border border-b-0 bg-muted/50 text-foreground hover:bg-muted/50"
                    : "border border-b-0 border-transparent bg-transparent text-muted-foreground hover:bg-transparent"
                )}
                onClick={() => setSectionName(section)}
              >
                <span>{section}</span>
                <Badge variant="secondary" className="h-5 min-w-5 rounded-sm px-1.5 text-[10px] tabular-nums">
                  {menuItems.filter((item) => item.sectionName === section).length}
                </Badge>
              </Button>
            ))}
          </div>

          <Card className="overflow-hidden gap-0 py-0">
            <CardContent className="px-0 py-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12" />
                      <TableHead>Name</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead>Cost/Serve</TableHead>
                      <TableHead>GP %</TableHead>
                      <TableHead>PLU</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      className="h-14 cursor-pointer bg-[#bcdc88]/20 hover:bg-[#bcdc88]/50"
                      onClick={openCreateSheet}
                    >
                      <TableCell>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/5">
                          <Plus className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        Add item to {sectionName === "all" ? "Menu" : sectionName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                    </TableRow>

                    {menuItemsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                          Loading menu…
                        </TableCell>
                      </TableRow>
                    ) : pagedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                          Nothing on the menu yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedItems.map((item) => {
                        const belowGp = item.gpPercent < TARGET_GP_PERCENT;
                        return (
                          <TableRow
                            key={item.id}
                            className="h-14 cursor-pointer hover:bg-muted/50"
                            onClick={() => openEditSheet(item)}
                          >
                            <TableCell>
                              {item.showOnMenu ? (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.recipeSummary}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {item.tags.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">-</span>
                                ) : (
                                  item.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="rounded-sm px-1.5 text-[10px]">
                                      {tag}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.priceMode === "MANUAL" ? "Manual" : "Auto"}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(item.priceCents)}</TableCell>
                            <TableCell>{item.gstMode}</TableCell>
                            <TableCell>{formatCurrency(item.costPerServeCents)}</TableCell>
                            <TableCell>
                              <span className={cn("font-semibold", getGpColor(item.gpPercent))}>
                                {item.gpPercent.toFixed(1)}%
                              </span>
                              {belowGp ? (
                                <AlertTriangle className="ml-1 inline h-3 w-3 text-red-500" />
                              ) : null}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.pluCode || "—"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                  {selectedSectionItemsCount > 0 ? (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={7} className="text-right font-semibold">
                          Visible Totals
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(
                            menuItems.reduce((sum, item) => sum + item.costPerServeCents, 0)
                          )}
                        </TableCell>
                        <TableCell className={cn("font-bold", getGpColor(
                          menuItems.length === 0
                            ? 0
                            : menuItems.reduce((sum, item) => sum + item.gpPercent, 0) / menuItems.length
                        ))}>
                          {menuItems.length === 0
                            ? "0.0%"
                            : `${(
                                menuItems.reduce((sum, item) => sum + item.gpPercent, 0) /
                                menuItems.length
                              ).toFixed(1)}%`}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  ) : null}
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-xs text-muted-foreground">
            {isShowingAll
              ? `Showing all ${totalItems} items`
              : `Showing ${visibleStart}-${visibleEnd} of ${totalItems}`}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page:</span>
              {isHydrated ? (
                <Select
                  value={isShowingAll ? "all" : String(pageSize)}
                  onValueChange={(value) => setPageSize(value === "all" ? -1 : Number(value))}
                >
                  <SelectTrigger className="h-8 w-[88px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-8 w-[88px] rounded-md border bg-background" />
              )}
            </div>

            {!isShowingAll ? (
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
            ) : null}
          </div>
        </div>
      </section>

      <Sheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSheetMode(null);
            setSelectedMenuItemId(null);
          }
        }}
      >
        <SheetContent
          side={sheetMode === "create" ? "top" : "bottom"}
          className={cn(
            "inset-x-1/2 right-auto flex w-full max-w-3xl -translate-x-1/2 flex-col overflow-hidden border md:w-[55vw]",
            sheetMode === "create"
              ? "top-0 bottom-14 rounded-t-none rounded-b-xl"
              : "top-14 bottom-0 rounded-t-xl"
          )}
        >
          <SheetTitle className="sr-only">
            {sheetMode === "create" ? "Add to menu" : "Edit menu line"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Create or edit what appears on the menu and linked catalog items.
          </SheetDescription>

          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">
                    {sheetMode === "create" ? "New menu line" : form.name || "Menu editor"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Manage what appears on the menu and linked catalog items.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {sheetMode === "edit" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void deleteCurrentMenuItem()}
                      disabled={deleteMenuItem.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => void saveMenuItem()}
                    disabled={createMenuItem.isPending || updateMenuItem.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Details
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Input
                      value={form.sectionName}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, sectionName: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price Mode</Label>
                    <Select
                      value={form.priceMode}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          priceMode: value as MenuItemPriceMode,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANUAL">Manual</SelectItem>
                        <SelectItem value="AUTO_FROM_RECIPE">Auto from catalog item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price (A$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={priceInput}
                      onChange={(event) => setPriceInput(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GST Mode</Label>
                    <Select
                      value={form.gstMode}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          gstMode: value as MenuItemGstMode,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INC">INC</SelectItem>
                        <SelectItem value="EX">EX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>PLU Code</Label>
                    <Input
                      value={form.pluCode ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, pluCode: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Tags (comma separated)</Label>
                    <Textarea
                      rows={2}
                      value={tagsInput}
                      onChange={(event) => setTagsInput(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select
                      value={form.showOnMenu ? "show" : "hide"}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          showOnMenu: value === "show",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="show">Show on menu</SelectItem>
                        <SelectItem value="hide">Hide from menu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          status: value as MenuItemStatus,
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
                </div>
              </div>

              <div className="mt-4 space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Catalog item components
                  </h3>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={addComponentRow}>
                    <Plus className="h-4 w-4" />
                    Add Component
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Items</TableHead>
                      <TableHead className="w-28">Quantity</TableHead>
                      <TableHead className="w-36 text-right">Line Cost</TableHead>
                      <TableHead className="w-14" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.components.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                          No catalog item components yet. Add at least one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      form.components.map((component, index) => {
                        const lineCost = Math.round(
                          (recipeCostMap.get(component.recipeId) ?? 0) * component.quantity
                        );
                        return (
                          <TableRow key={`${component.recipeId}-${index}`}>
                            <TableCell>
                              <Select
                                value={component.recipeId || "__none__"}
                                onValueChange={(value) =>
                                  updateComponentRow(
                                    index,
                                    { recipeId: value === "__none__" ? "" : value }
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select catalog item" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Select catalog item</SelectItem>
                                  {recipes.map((recipe) => (
                                    <SelectItem key={recipe.id} value={recipe.id}>
                                      {recipe.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={component.quantity}
                                onChange={(event) =>
                                  updateComponentRow(index, {
                                    quantity: Math.max(0, Number(event.target.value) || 0),
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatCurrency(lineCost)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeComponentRow(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="border-t bg-background p-4 md:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Computed Cost / Serve</p>
                  <p className="text-base font-semibold tabular-nums">
                    {formatCurrency(computedCostPerServe)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="text-base font-semibold tabular-nums">
                    {formatCurrency(parseDollarsToCents(priceInput))}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Computed GP %</p>
                  <p className={cn("text-base font-semibold tabular-nums", getGpColor(computedGpPercent))}>
                    {computedGpPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={isAddSectionDialogOpen}
        onOpenChange={(open) => {
          setIsAddSectionDialogOpen(open);
          if (!open) {
            setNewSectionName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Section</DialogTitle>
            <DialogDescription>
              Add a new menu section for grouping items.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            <Label htmlFor="new-section-name">Section name</Label>
            <Input
              id="new-section-name"
              value={newSectionName}
              onChange={(event) => setNewSectionName(event.target.value)}
              placeholder="e.g. Burgers"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  createSection();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSection} disabled={!newSectionName.trim()}>
              Create Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
