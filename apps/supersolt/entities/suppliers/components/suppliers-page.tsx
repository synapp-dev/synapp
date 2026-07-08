"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Download,
  Eraser,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@workspace/ui/components/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Badge } from "@workspace/ui/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { useSupplierMutations } from "@/entities/suppliers/model/useSupplierMutations";
import { useSuppliersQuery } from "@/entities/suppliers/model/useSuppliersQuery";
import { EmptySupplierCatalogBanner } from "@/entities/suppliers/components/empty-supplier-catalog-banner";
import { OrphanBillAttributionBanner } from "@/entities/inventory-setup/components/orphan-bill-attribution-banner";
import { useSuppliersFilterStore } from "@/entities/suppliers/model/store";
import type { SupplierCategory, UpsertSupplierInput } from "@/entities/suppliers/model/types";
import { SupplierDetailPageClient } from "./supplier-detail-page";
import { SupplierTruckAnimation } from "./supplier-truck-animation";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { xeroApi } from "@/entities/xero/api/endpoints";
import { suppliersApi } from "@/entities/suppliers/api/endpoints";
import { useVenueXeroConnectionQuery } from "@/entities/xero/model/use-venue-xero-connection";
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import { useInventorySetupImport } from "@/entities/inventory-setup/components/inventory-setup-import-provider";
import { consumeSupplierSetupComplete } from "@/entities/inventory-setup/lib/supplier-setup-handoff";
import { InvoiceUploadDialog } from "@/entities/invoices/components/invoice-upload-dialog";

type SuppliersPageClientProps = {
  organisation: string;
  venue: string;
  hidePageHeader?: boolean;
  inventorySetupMode?: boolean;
};

const CATEGORIES: Array<{ value: SupplierCategory; label: string }> = [
  { value: "produce", label: "Produce" },
  { value: "meat", label: "Meat & Seafood" },
  { value: "dry-goods", label: "Dry Goods" },
  { value: "beverages", label: "Beverages" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

const ORDER_METHODS = ["Email", "Phone", "WhatsApp", "Portal", "Other"] as const;

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

const FIRST_RUN_CARD_CLASS =
  "group flex flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-60";
const FIRST_RUN_ICON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:text-foreground";

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/**
 * "12 (34)" — unique products first (unit/wording variants folded together,
 * same grouping as the normalisation queue), total raw items parsed off
 * invoices in brackets. Just "0" when the supplier has none in the category.
 */
function ItemBreakdownCell({
  breakdown,
}: {
  breakdown: { unique: number; parsed: number };
}) {
  if (breakdown.parsed === 0) {
    return <span className="text-muted-foreground">0</span>;
  }
  return (
    <span>
      {breakdown.unique}
      <span className="text-muted-foreground"> ({breakdown.parsed})</span>
    </span>
  );
}

function createDefaultSupplier(): UpsertSupplierInput {
  return {
    name: "",
    contactPerson: "",
    email: "",
    orderingEmail: "",
    phone: "",
    abn: "",
    category: "other",
    paymentTerms: "",
    deliveryDays: "",
    orderMethod: "Email",
    active: true,
    sharedAcrossVenues: false,
    addressLine1: "",
    addressLine2: "",
    suburb: "",
    state: "",
    postcode: "",
    country: "Australia",
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SuppliersPageClient({
  organisation,
  venue,
  hidePageHeader = false,
  inventorySetupMode = false,
}: SuppliersPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isHydrated, setIsHydrated] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailSupplierId, setDetailSupplierId] = useState<string | null>(null);
  const [form, setForm] = useState<UpsertSupplierInput>(createDefaultSupplier);
  // After a completed inventory-setup import we land here with ?setupComplete=1.
  // Once the table has actually loaded with suppliers, we offer to walk through
  // configuring them (see the completion dialog below).
  const [setupCompleteOpen, setSetupCompleteOpen] = useState(false);

  const integrationsPath = buildScopedPath(organisation, venue, "settings/integrations");
  const configurePath = buildScopedPath(
    organisation,
    venue,
    "settings/inventory-setup/suppliers/configure",
  );
  const suppliersListPath = buildScopedPath(
    organisation,
    venue,
    inventorySetupMode ? "settings/inventory-setup/suppliers" : "purchasing/suppliers",
  );
  const xeroConnection = useVenueXeroConnectionQuery(organisation, venue);
  const inventorySetupImport = useInventorySetupImport();
  const isSetupImportRunning = inventorySetupMode
    ? inventorySetupImport.isImportInProgress
    : false;

  const xeroImport = useMutation({
    mutationFn: async () => {
      if (inventorySetupMode) {
        await inventorySetupImport.startImport();
        return null;
      }

      const { data, error } = await xeroApi.syncSuppliers({
        organisationSlug: organisation,
        venueSlug: venue,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Import failed");
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (data) => {
      if (inventorySetupMode) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: suppliersKeys.scope(organisation, venue),
      });

      const supplierData = data as { created: number; updated: number };
      toast.success(
        `Imported ${supplierData.created} new and updated ${supplierData.updated} suppliers from Xero`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Xero import failed");
    },
  });

  // Testing convenience: auto-complete the whole supplier stage in one click.
  const smartFill = useMutation({
    mutationFn: async () => {
      const { data, error } = await suppliersApi.post.smartFill(organisation, venue);
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Smart fill failed");
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: suppliersKeys.scope(organisation, venue),
      });
      await queryClient.invalidateQueries({ queryKey: ["supplier-raw-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-setup"] });
      toast.success(
        `Smart fill done — ${data.productsCreated} products, ${data.itemsCleared} cleared, ${data.profilesFilled} profiles filled, ${data.deactivated} suppliers deactivated`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Smart fill failed");
    },
  });

  // Testing convenience: undo Smart Fill in one click.
  const resetApprovals = useMutation({
    mutationFn: async () => {
      const { data, error } = await suppliersApi.post.resetApprovals(organisation, venue);
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Reset failed");
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: suppliersKeys.scope(organisation, venue),
      });
      await queryClient.invalidateQueries({ queryKey: ["supplier-raw-items"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-setup"] });
      toast.success(
        `Reset done — ${data.productsRemoved} products removed, ${data.itemsReset} items back to unreviewed`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Reset failed");
    },
  });

  const search = useSuppliersFilterStore((state) => state.search);
  const category = useSuppliersFilterStore((state) => state.category);
  const status = useSuppliersFilterStore((state) => state.status);
  const archived = useSuppliersFilterStore((state) => state.archived);
  const hasProducts = useSuppliersFilterStore((state) => state.hasProducts);
  const sort = useSuppliersFilterStore((state) => state.sort);
  const page = useSuppliersFilterStore((state) => state.page);
  const pageSize = useSuppliersFilterStore((state) => state.pageSize);
  const viewMode = useSuppliersFilterStore((state) => state.viewMode);
  const setSearch = useSuppliersFilterStore((state) => state.setSearch);
  const setCategory = useSuppliersFilterStore((state) => state.setCategory);
  const setStatus = useSuppliersFilterStore((state) => state.setStatus);
  const setArchived = useSuppliersFilterStore((state) => state.setArchived);
  const setHasProducts = useSuppliersFilterStore((state) => state.setHasProducts);
  const setSort = useSuppliersFilterStore((state) => state.setSort);
  const setPage = useSuppliersFilterStore((state) => state.setPage);
  const setPageSize = useSuppliersFilterStore((state) => state.setPageSize);
  const setViewMode = useSuppliersFilterStore((state) => state.setViewMode);
  const resetFilters = useSuppliersFilterStore((state) => state.reset);

  const suppliersQuery = useSuppliersQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    search: search.trim() || undefined,
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
    archived,
    hasProducts:
      hasProducts === "yes" ? true : hasProducts === "no" ? false : undefined,
    // In inventory setup, only show suppliers kept as inventory sources at the
    // selection gate — the deselected (non-ingredient) ones are hidden here.
    inventorySource: inventorySetupMode ? true : undefined,
    sort: sort as "name" | "last_invoice" | "ytd_spend",
    page,
    pageSize,
  });

  const { createSupplier } = useSupplierMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const suppliers = suppliersQuery.data?.suppliers ?? [];
  // Kept inventory suppliers with no priced catalog and not parked — surfaced in
  // the recovery banner. needsCatalog is already false for non-inventory and
  // acked suppliers, so this filter alone is the right set.
  const emptyCatalogSuppliers = suppliers
    .filter((supplier) => supplier.readiness.needsCatalog)
    .map((supplier) => ({ id: supplier.id, name: supplier.name }));
  // Real suppliers offered as attribution targets for orphan bills.
  const candidateSuppliers = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
  }));
  const totalItems = suppliersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const visibleStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleEnd = totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize);
  const hasActiveFilters =
    search.trim().length > 0 ||
    category !== "all" ||
    status !== "all" ||
    archived ||
    hasProducts !== "all" ||
    sort !== "name";

  // Count of filters surfaced in the popover (search has its own field).
  const activeFilterCount =
    (category !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (archived ? 1 : 0) +
    (hasProducts !== "all" ? 1 : 0) +
    (sort !== "name" ? 1 : 0);

  // Brand-new venue with no suppliers and nothing filtered out — show a guided
  // "import your first supplier" empty state instead of the filters + table.
  const isEmptyFirstRun =
    !suppliersQuery.isLoading &&
    !suppliersQuery.isError &&
    totalItems === 0 &&
    !hasActiveFilters;

  // In inventory-setup, an empty suppliers list hands off to the dedicated
  // "import your first supplier" picker (/suppliers/start) — which owns the
  // truck + entry-point cards — rather than showing them inline here.
  const setupStartPath = buildScopedPath(
    organisation,
    venue,
    "settings/inventory-setup/suppliers/start",
  );
  useEffect(() => {
    if (inventorySetupMode && isEmptyFirstRun) {
      router.replace(setupStartPath);
    }
  }, [inventorySetupMode, isEmptyFirstRun, router, setupStartPath]);

  // The persisted view preference only applies after hydration, so SSR/first
  // paint always renders the table and avoids a hydration mismatch.
  const effectiveView = isHydrated ? viewMode : "table";

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const xeroAutoImportStarted = useRef(false);

  useEffect(() => {
    if (searchParams.get("xero") !== "connected" || !xeroConnection.data?.connected) {
      return;
    }
    if (xeroAutoImportStarted.current) {
      return;
    }
    xeroAutoImportStarted.current = true;
    void xeroImport
      .mutateAsync()
      .catch(() => undefined)
      .finally(() => {
        router.replace(suppliersListPath, {
          scroll: false,
        });
      });
  }, [searchParams, xeroConnection.data?.connected, organisation, venue, router, xeroImport]);

  const openSupplierFromUrl = searchParams.get("openSupplier");
  useEffect(() => {
    if (!openSupplierFromUrl) {
      return;
    }
    setDetailSupplierId(openSupplierFromUrl);
    router.replace(buildScopedPath(organisation, venue, "purchasing/suppliers"), { scroll: false });
  }, [openSupplierFromUrl, organisation, venue, router]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, setPage, totalPages]);

  function clearFilters() {
    resetFilters();
  }

  function openCreateSheet() {
    setForm(createDefaultSupplier());
    setSheetOpen(true);
  }

  function openSupplierDetailSheet(supplierId: string) {
    setDetailSupplierId(supplierId);
  }

  // Arriving from a completed setup import: the import page leaves a one-shot
  // sessionStorage flag (query params don't survive these scoped routes). Read it
  // once on mount, then open the "want me to walk you through it?" dialog as soon
  // as the table has actually loaded with suppliers.
  const [handoffPending, setHandoffPending] = useState(false);
  useEffect(() => {
    if (inventorySetupMode && consumeSupplierSetupComplete()) {
      setHandoffPending(true);
    }
  }, [inventorySetupMode]);
  useEffect(() => {
    if (!handoffPending) return;
    if (suppliersQuery.isLoading || suppliersQuery.isError) return;
    if (suppliers.length === 0) return;
    setHandoffPending(false);
    setSetupCompleteOpen(true);
  }, [handoffPending, suppliersQuery.isLoading, suppliersQuery.isError, suppliers.length]);

  function dismissSetupComplete() {
    setSetupCompleteOpen(false);
  }

  function handleDetailClose() {
    setDetailSupplierId(null);
  }

  const xeroImportButton = xeroConnection.data?.connected ? (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={inventorySetupMode ? isSetupImportRunning : xeroImport.isPending}
      onClick={() => void xeroImport.mutate()}
    >
      {(inventorySetupMode ? isSetupImportRunning : xeroImport.isPending) ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      Import from Xero
    </Button>
  ) : (
    <Button variant="outline" size="sm" asChild>
      <Link href={integrationsPath}>Connect Xero</Link>
    </Button>
  );

  async function handleSave() {
    const payload: UpsertSupplierInput = {
      ...form,
      name: form.name.trim(),
      contactPerson: form.contactPerson?.trim() ?? "",
      email: form.email?.trim() ?? "",
      orderingEmail: form.orderingEmail?.trim() ?? "",
      phone: form.phone?.trim() ?? "",
      abn: form.abn?.trim() ?? "",
      paymentTerms: form.paymentTerms?.trim() ?? "",
      deliveryDays: form.deliveryDays?.trim() ?? "",
      orderMethod: form.orderMethod?.trim() ?? "",
      addressLine1: form.addressLine1?.trim() ?? "",
      addressLine2: form.addressLine2?.trim() ?? "",
      suburb: form.suburb?.trim() ?? "",
      postcode: form.postcode?.trim() ?? "",
      country: form.country?.trim() ?? "",
    };

    if (!payload.name) {
      toast.error("Supplier name is required");
      return;
    }

    // Contact email is required — orders are emailed to the supplier automatically.
    if (!payload.email) {
      toast.error("A contact email is required so we can send orders to this supplier");
      return;
    }
    if (!EMAIL_PATTERN.test(payload.email)) {
      toast.error("Enter a valid contact email address");
      return;
    }

    await createSupplier.mutateAsync({
      organisationSlug: organisation,
      venueSlug: venue,
      payload,
    });
    toast.success("Supplier created");

    setSheetOpen(false);
  }

  return (
    <>
      <section
        className={cn(
          "flex flex-col gap-5",
          // In setup mode, pin the section to the viewport so the table body
          // scrolls on its own and the pagination bar stays visible at the
          // bottom. Elsewhere keep the page's natural document scroll.
          inventorySetupMode
            ? "h-[calc(100dvh-10rem)] min-h-[28rem] overflow-hidden"
            : "min-h-[calc(100vh-10rem)]",
        )}
      >
        {hidePageHeader ? null : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                Suppliers
              </h1>
            </div>
            <Separator />
          </>
        )}

        {isEmptyFirstRun ? (
          inventorySetupMode ? (
            <div
              className="text-muted-foreground flex flex-1 items-center justify-center py-12 text-sm"
              aria-busy="true"
            >
              Taking you to setup…
            </div>
          ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-7 py-12">
            <div className="flex flex-col items-center text-center">
              <SupplierTruckAnimation className="mb-5 h-[16rem] w-[28rem] sm:h-[18rem] sm:w-[32rem]" />
              <h2 className="text-lg font-semibold">Import your first supplier</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick how you'd like to get started.
              </p>
            </div>
            <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {xeroConnection.data?.connected ? (
                <button
                  type="button"
                  className={FIRST_RUN_CARD_CLASS}
                  disabled={inventorySetupMode ? isSetupImportRunning : xeroImport.isPending}
                  onClick={() => void xeroImport.mutate()}
                >
                  <span className={FIRST_RUN_ICON_CLASS}>
                    {(inventorySetupMode ? isSetupImportRunning : xeroImport.isPending) ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Download className="h-5 w-5" />
                    )}
                  </span>
                  <span className="text-sm font-medium">Import from Xero</span>
                  <span className="text-xs text-muted-foreground">
                    Pull in your supplier contacts and invoices automatically.
                  </span>
                </button>
              ) : (
                <Link href={integrationsPath} className={FIRST_RUN_CARD_CLASS}>
                  <span className={FIRST_RUN_ICON_CLASS}>
                    <Download className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">Import from Xero</span>
                  <span className="text-xs text-muted-foreground">
                    Connect Xero to import your existing suppliers.
                  </span>
                </Link>
              )}

              <InvoiceUploadDialog
                organisation={organisation}
                venue={venue}
                trigger={
                  <button type="button" className={FIRST_RUN_CARD_CLASS}>
                    <span className={FIRST_RUN_ICON_CLASS}>
                      <Upload className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium">Upload invoice</span>
                    <span className="text-xs text-muted-foreground">
                      We'll read it and pull out the supplier and items.
                    </span>
                  </button>
                }
              />

              <button
                type="button"
                className={FIRST_RUN_CARD_CLASS}
                onClick={openCreateSheet}
              >
                <span className={FIRST_RUN_ICON_CLASS}>
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">Add manually</span>
                <span className="text-xs text-muted-foreground">
                  Enter a supplier's contact and ordering details yourself.
                </span>
              </button>
            </div>
          </div>
          )
        ) : (
          <>
        {inventorySetupMode && emptyCatalogSuppliers.length > 0 ? (
          <EmptySupplierCatalogBanner
            organisation={organisation}
            venue={venue}
            suppliers={emptyCatalogSuppliers}
          />
        ) : null}
        {inventorySetupMode ? (
          <OrphanBillAttributionBanner
            organisation={organisation}
            venue={venue}
            candidateSuppliers={candidateSuppliers}
          />
        ) : null}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          {/* Left: view switcher · search */}
          <div className="flex flex-wrap items-center gap-3">
            {isHydrated ? (
              <div className="inline-flex items-center rounded-md border p-0.5">
                <Button
                  type="button"
                  variant={effectiveView === "table" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label="Table view"
                  aria-pressed={effectiveView === "table"}
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant={effectiveView === "cards" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label="Card view"
                  aria-pressed={effectiveView === "cards"}
                  onClick={() => setViewMode("cards")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="h-8 w-[68px] rounded-md border bg-background" />
            )}

            {inventorySetupMode ? (
              <>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-[var(--brand-supersolt-primary)] text-black hover:bg-[var(--brand-supersolt-primary)]/90"
                  onClick={() => router.push(configurePath)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Setup wizard
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5"
                  disabled={smartFill.isPending}
                  onClick={() => void smartFill.mutate()}
                  title="Testing: approve all inventory items, clear non-inventory, deactivate empty suppliers"
                >
                  {smartFill.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <WandSparkles className="h-3.5 w-3.5" />
                  )}
                  Smart fill (test)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5"
                  disabled={resetApprovals.isPending}
                  onClick={() => void resetApprovals.mutate()}
                  title="Testing: undo smart fill — back to just raw items, none approved"
                >
                  {resetApprovals.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eraser className="h-3.5 w-3.5" />
                  )}
                  Reset approvals (test)
                </Button>
              </>
            ) : null}

            <span className="text-muted-foreground/40 select-none" aria-hidden>
              ·
            </span>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, ABN..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-[360px] max-w-full pl-8"
              />
            </div>
          </div>

          {/* Right: filters popover · import */}
          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="ml-0.5 h-5 min-w-5 justify-center rounded-full px-1 text-xs tabular-nums"
                    >
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-72 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Filters</span>
                  {hasActiveFilters ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-2 h-7 gap-1 text-xs"
                      onClick={clearFilters}
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Category</span>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9 w-full">
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
                </div>

                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Status</span>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs font-medium">List</span>
                  <Select
                    value={archived ? "archived" : "active_list"}
                    onValueChange={(v) => setArchived(v === "archived")}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active_list">Active list</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Items</span>
                  <Select value={hasProducts} onValueChange={setHasProducts}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All suppliers</SelectItem>
                      <SelectItem value="yes">Has items</SelectItem>
                      <SelectItem value="no">No items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs font-medium">Sort by</span>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="ytd_spend">YTD spend</SelectItem>
                      <SelectItem value="last_invoice">Last invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground/40 select-none" aria-hidden>
              ·
            </span>

            {xeroImportButton}
          </div>
        </div>

        {effectiveView === "cards" ? (
          <div className="min-h-0 flex-1 overflow-auto">
            {suppliersQuery.isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Loading suppliers...
              </p>
            ) : suppliersQuery.isError ? (
              <p className="py-10 text-center text-sm text-destructive">
                {suppliersQuery.error.message}
              </p>
            ) : suppliers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No suppliers match your filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={openCreateSheet}
                  className="flex min-h-[160px] items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" />
                  Add new supplier
                </button>

                {suppliers.map((supplier) => {
                  const needsAttention = supplier.readiness.total > 0;
                  return (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => openSupplierDetailSheet(supplier.id)}
                    className={cn(
                      "group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30",
                      needsAttention &&
                        "border-amber-300 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/20",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/20">
                          <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <span className="truncate font-medium">{supplier.name}</span>
                      </div>
                      {needsAttention ? (
                        <span
                          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
                          title={`${supplier.readiness.total} item${supplier.readiness.total === 1 ? "" : "s"} left to finish setup`}
                        >
                          <TriangleAlert className="h-3.5 w-3.5" /> Needs attention
                        </span>
                      ) : supplier.active ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
                        </span>
                      )}
                    </div>

                    <span className="w-fit rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {categoryLabel(supplier.category)}
                    </span>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">Contact</dt>
                        <dd className="truncate">
                          {supplier.contactPerson || supplier.email || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Last invoice</dt>
                        <dd className="text-muted-foreground">
                          {supplier.lastInvoiceDate ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Items</dt>
                        <dd className="tabular-nums">{supplier.itemCount}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">YTD spend</dt>
                        <dd className="font-medium tabular-nums">
                          {supplier.ytdSpendCents > 0
                            ? formatCurrency(supplier.ytdSpendCents)
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <Card className="flex-1 overflow-hidden gap-0 py-0">
          <CardContent className="flex h-full min-h-0 flex-col px-0 py-0">
            {/* Make shadcn's table-container (the real scroll ancestor) the bounded
                scroller so the sticky header pins to it. */}
            <div className="min-h-0 flex-1 [&>[data-slot=table-container]]:h-full [&>[data-slot=table-container]]:overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="pl-6 bg-muted sticky top-0 z-10 text-xs font-medium uppercase tracking-wider">Status</TableHead>
                    <TableHead className="bg-muted sticky top-0 z-10 text-xs font-medium uppercase tracking-wider">Name</TableHead>
                    <TableHead className="bg-muted sticky top-0 z-10 text-xs font-medium uppercase tracking-wider">Category</TableHead>
                    <TableHead className="bg-muted sticky top-0 z-10 text-xs font-medium uppercase tracking-wider">Inventory items</TableHead>
                    <TableHead className="bg-muted sticky top-0 z-10 text-xs font-medium uppercase tracking-wider">Non-inventory items</TableHead>
                    <TableHead className="bg-muted sticky top-0 z-10 text-xs font-medium uppercase tracking-wider">Approved items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    className="cursor-pointer bg-[#bcdc88]/20 hover:bg-[#bcdc88]/50"
                    onClick={openCreateSheet}
                  >
                    <TableCell className="pl-6 text-muted-foreground">-</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/5">
                          <Plus className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium">Add new supplier</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                  </TableRow>

                  {suppliersQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Loading suppliers...
                      </TableCell>
                    </TableRow>
                  ) : suppliersQuery.isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                        {suppliersQuery.error.message}
                      </TableCell>
                    </TableRow>
                  ) : suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center">
                        <p className="text-sm font-medium">No suppliers yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {xeroConnection.data?.connected
                            ? "Import your supplier contacts from Xero, or add one manually."
                            : "Connect Xero to import your existing suppliers, or add one manually."}
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                          {xeroConnection.data?.connected ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                inventorySetupMode ? isSetupImportRunning : xeroImport.isPending
                              }
                              onClick={() => void xeroImport.mutate()}
                            >
                              Import from Xero
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={integrationsPath}>Connect Xero</Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((supplier) => {
                      const needsAttention = supplier.readiness.total > 0;
                      return (
                      <TableRow
                        key={supplier.id}
                        className={cn(
                          "cursor-pointer",
                          needsAttention
                            ? "bg-amber-50/60 hover:bg-amber-100/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                            : "hover:bg-muted/50",
                        )}
                        onClick={() => openSupplierDetailSheet(supplier.id)}
                      >
                        <TableCell className="pl-6">
                          {needsAttention ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
                              title={`${supplier.readiness.total} item${supplier.readiness.total === 1 ? "" : "s"} left to finish setup`}
                            >
                              <TriangleAlert className="h-3.5 w-3.5" /> Needs attention
                            </span>
                          ) : supplier.active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/20">
                              <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <span className="font-medium">{supplier.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {categoryLabel(supplier.category)}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          <ItemBreakdownCell breakdown={supplier.inventoryItems} />
                        </TableCell>
                        <TableCell className="tabular-nums">
                          <ItemBreakdownCell breakdown={supplier.nonInventoryItems} />
                        </TableCell>
                        <TableCell className="tabular-nums">{supplier.productCount}</TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        )}

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-1">
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
          </>
        )}
      </section>

      <Sheet
        open={detailSupplierId !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleDetailClose();
          }
        }}
      >
        <SheetContent
          side="bottom"
          className={cn(
            "inset-x-1/2 right-auto top-14 flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full max-w-6xl -translate-x-1/2 flex-col overflow-hidden rounded-t-xl border p-0 md:w-[min(96vw,72rem)]"
          )}
        >
          <SheetTitle className="sr-only">Supplier details</SheetTitle>
          <SheetDescription className="sr-only">View and edit supplier.</SheetDescription>
          {detailSupplierId ? (
            <SupplierDetailPageClient
              key={detailSupplierId}
              organisation={organisation}
              venue={venue}
              supplierId={detailSupplierId}
              variant="sheet"
              inventorySetupMode={inventorySetupMode}
              onClose={handleDetailClose}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={setupCompleteOpen}
        onOpenChange={(open) => {
          if (!open) dismissSetupComplete();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your suppliers are ready</DialogTitle>
            <DialogDescription>
              I&apos;ve pulled in {totalItems} supplier{totalItems === 1 ? "" : "s"} from Xero.
              Want me to walk you through setting each of them up — contact, payment, delivery
              and items?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={dismissSetupComplete}>
              No, I&apos;ll do it myself
            </Button>
            <Button
              className="gap-1.5 bg-[var(--brand-supersolt-primary)] text-black hover:bg-[var(--brand-supersolt-primary)]/90"
              onClick={() => {
                setSetupCompleteOpen(false);
                router.push(configurePath);
              }}
            >
              <Sparkles className="size-4" />
              Yes, walk me through it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
        }}
      >
        <SheetContent
          side="top"
          className={cn(
            "inset-x-1/2 right-auto top-0 bottom-14 flex w-full max-w-2xl -translate-x-1/2 flex-col gap-0 overflow-hidden rounded-t-none rounded-b-xl border md:w-[50vw]"
          )}
        >
          <SheetHeader className="border-b p-4 md:px-6 md:py-5">
            <SheetTitle className="text-lg font-semibold">New supplier</SheetTitle>
            <SheetDescription>
              Add the supplier&apos;s details. A contact email is required — we use it to email orders
              to the supplier automatically.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
            <FieldGroup>
              <FieldSet>
                <FieldLegend variant="label">Identity</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="supplier-name">Supplier name *</FieldLabel>
                    <Input
                      id="supplier-name"
                      placeholder="e.g. Pacific Fresh Produce"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </Field>
                  <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="supplier-category">Category</FieldLabel>
                      <Select
                        value={form.category}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, category: value as SupplierCategory }))
                        }
                      >
                        <SelectTrigger id="supplier-category" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="supplier-abn">ABN</FieldLabel>
                      <Input
                        id="supplier-abn"
                        inputMode="numeric"
                        placeholder="11 digit ABN"
                        value={form.abn ?? ""}
                        onChange={(event) => setForm((current) => ({ ...current, abn: event.target.value }))}
                      />
                      <FieldDescription>Helps us match incoming invoices to this supplier.</FieldDescription>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>

              <FieldSeparator />

              <FieldSet>
                <FieldLegend variant="label">Contact &amp; address</FieldLegend>
                <FieldGroup>
                  <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="supplier-contact">Contact person</FieldLabel>
                      <Input
                        id="supplier-contact"
                        value={form.contactPerson ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, contactPerson: event.target.value }))
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="supplier-phone">Phone</FieldLabel>
                      <Input
                        id="supplier-phone"
                        type="tel"
                        value={form.phone ?? ""}
                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="supplier-email">Contact email *</FieldLabel>
                    <Input
                      id="supplier-email"
                      type="email"
                      placeholder="orders@supplier.com"
                      value={form.email ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    />
                    <FieldDescription>
                      Purchase orders are emailed here. You can set a separate ordering address later.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="supplier-addr1">Address line 1</FieldLabel>
                    <Input
                      id="supplier-addr1"
                      value={form.addressLine1 ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, addressLine1: event.target.value }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="supplier-addr2">Address line 2</FieldLabel>
                    <Input
                      id="supplier-addr2"
                      value={form.addressLine2 ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, addressLine2: event.target.value }))
                      }
                    />
                  </Field>
                  <div className="grid gap-x-4 gap-y-6 sm:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="supplier-suburb">Suburb</FieldLabel>
                      <Input
                        id="supplier-suburb"
                        value={form.suburb ?? ""}
                        onChange={(event) => setForm((current) => ({ ...current, suburb: event.target.value }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="supplier-state">State</FieldLabel>
                      <Select
                        value={form.state || "_none"}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, state: value === "_none" ? "" : value }))
                        }
                      >
                        <SelectTrigger id="supplier-state" className="w-full">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">—</SelectItem>
                          {AU_STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="supplier-postcode">Postcode</FieldLabel>
                      <Input
                        id="supplier-postcode"
                        inputMode="numeric"
                        value={form.postcode ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, postcode: event.target.value }))
                        }
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="supplier-country">Country</FieldLabel>
                    <Input
                      id="supplier-country"
                      value={form.country ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>

              <FieldSeparator />

              <FieldSet>
                <FieldLegend variant="label">Ordering &amp; terms</FieldLegend>
                <FieldGroup>
                  <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="supplier-order-method">Order method</FieldLabel>
                      <Select
                        value={form.orderMethod || "Email"}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, orderMethod: value }))
                        }
                      >
                        <SelectTrigger id="supplier-order-method" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="supplier-payment">Payment terms</FieldLabel>
                      <Input
                        id="supplier-payment"
                        placeholder="e.g. Net 14"
                        value={form.paymentTerms ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, paymentTerms: event.target.value }))
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="supplier-delivery">Delivery days</FieldLabel>
                      <Input
                        id="supplier-delivery"
                        placeholder="e.g. Mon, Wed, Fri"
                        value={form.deliveryDays ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, deliveryDays: event.target.value }))
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="supplier-status">Status</FieldLabel>
                      <Select
                        value={form.active ? "active" : "inactive"}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, active: value === "active" }))
                        }
                      >
                        <SelectTrigger id="supplier-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="supplier-shared"
                      checked={form.sharedAcrossVenues}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          sharedAcrossVenues: checked === true,
                        }))
                      }
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="supplier-shared">
                        Share with all venues in this organisation
                      </FieldLabel>
                      <FieldDescription>
                        When checked, this supplier appears for every venue under the organisation.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </FieldGroup>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t p-4 md:px-6">
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={createSupplier.isPending}
            >
              Cancel
            </Button>
            <Button
              className="gap-1.5"
              onClick={() => void handleSave()}
              disabled={createSupplier.isPending}
            >
              {createSupplier.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save supplier
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
