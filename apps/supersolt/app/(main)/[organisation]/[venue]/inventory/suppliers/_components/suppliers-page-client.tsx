"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
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
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { useSupplierMutations } from "@/entities/suppliers/model/useSupplierMutations";
import { useSuppliersQuery } from "@/entities/suppliers/model/useSuppliersQuery";
import { useSuppliersFilterStore } from "@/entities/suppliers/model/store";
import type { SupplierCategory, UpsertSupplierInput } from "@/entities/suppliers/model/types";
import { SupplierDetailPageClient } from "./supplier-detail-page-client";
import { buildScopedPath } from "@/lib/build-scoped-path";

type SuppliersPageClientProps = {
  organisation: string;
  venue: string;
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

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function createDefaultSupplier(): UpsertSupplierInput {
  return {
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    abn: "",
    category: "other",
    paymentTerms: "",
    deliveryDays: "",
    orderMethod: "Email",
    active: true,
    sharedAcrossVenues: false,
  };
}

export function SuppliersPageClient({ organisation, venue }: SuppliersPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHydrated, setIsHydrated] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailSupplierId, setDetailSupplierId] = useState<string | null>(null);
  const [form, setForm] = useState<UpsertSupplierInput>(createDefaultSupplier);

  const search = useSuppliersFilterStore((state) => state.search);
  const category = useSuppliersFilterStore((state) => state.category);
  const status = useSuppliersFilterStore((state) => state.status);
  const page = useSuppliersFilterStore((state) => state.page);
  const pageSize = useSuppliersFilterStore((state) => state.pageSize);
  const setSearch = useSuppliersFilterStore((state) => state.setSearch);
  const setCategory = useSuppliersFilterStore((state) => state.setCategory);
  const setStatus = useSuppliersFilterStore((state) => state.setStatus);
  const setPage = useSuppliersFilterStore((state) => state.setPage);
  const setPageSize = useSuppliersFilterStore((state) => state.setPageSize);
  const resetFilters = useSuppliersFilterStore((state) => state.reset);

  const suppliersQuery = useSuppliersQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    search: search.trim() || undefined,
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
    page,
    pageSize,
  });

  const { createSupplier } = useSupplierMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const suppliers = suppliersQuery.data?.suppliers ?? [];
  const totalItems = suppliersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const visibleStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleEnd = totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize);
  const hasActiveFilters =
    search.trim().length > 0 || category !== "all" || status !== "all";

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const openSupplierFromUrl = searchParams.get("openSupplier");
  useEffect(() => {
    if (!openSupplierFromUrl) {
      return;
    }
    setDetailSupplierId(openSupplierFromUrl);
    router.replace(buildScopedPath(organisation, venue, "inventory/suppliers"), { scroll: false });
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

  async function handleSave() {
    const payload: UpsertSupplierInput = {
      ...form,
      name: form.name.trim(),
      contactPerson: form.contactPerson?.trim() ?? "",
      email: form.email?.trim() ?? "",
      phone: form.phone?.trim() ?? "",
      abn: form.abn?.trim() ?? "",
      paymentTerms: form.paymentTerms?.trim() ?? "",
      deliveryDays: form.deliveryDays?.trim() ?? "",
      orderMethod: form.orderMethod?.trim() ?? "",
    };

    if (!payload.name) {
      toast.error("Supplier name is required");
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
      <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Suppliers
          </h1>
        </div>
        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone, ABN..."
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
                  <SelectTrigger className="h-9 w-[170px]">
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
                <div className="h-9 w-[170px] rounded-md border bg-background" />
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
                    <TableHead className="text-xs font-medium uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">Phone</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">ABN</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">Scope</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wider">
                      Monthly spend
                    </TableHead>
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
                        <span className="font-medium">Add new supplier</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                  </TableRow>

                  {suppliersQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        Loading suppliers...
                      </TableCell>
                    </TableRow>
                  ) : suppliersQuery.isError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-destructive">
                        {suppliersQuery.error.message}
                      </TableCell>
                    </TableRow>
                  ) : suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        No suppliers found. Adjust filters or add a new supplier.
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((supplier) => (
                      <TableRow
                        key={supplier.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openSupplierDetailSheet(supplier.id)}
                      >
                        <TableCell className="pl-6">
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
                        <TableCell>{supplier.contactPerson || "—"}</TableCell>
                        <TableCell>{supplier.phone || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{supplier.abn || "—"}</TableCell>
                        <TableCell>
                          {supplier.sharedAcrossVenues ? (
                            <Badge variant="outline" className="text-[10px]">
                              All venues
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">This venue</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {supplier.active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {supplier.monthlySpendCents > 0 ? (
                            formatCurrency(supplier.monthlySpendCents)
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
        open={detailSupplierId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailSupplierId(null);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className={cn(
            "inset-x-1/2 right-auto top-14 flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full max-w-4xl -translate-x-1/2 flex-col overflow-hidden rounded-t-xl border p-0 md:w-[min(96vw,52rem)]"
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
              onClose={() => setDetailSupplierId(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
        }}
      >
        <SheetContent
          side="top"
          className={cn(
            "inset-x-1/2 right-auto top-0 bottom-14 flex w-full max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-t-none rounded-b-xl border md:w-[50vw]"
          )}
        >
          <SheetTitle className="sr-only">Create supplier</SheetTitle>
          <SheetDescription className="sr-only">Create a new supplier.</SheetDescription>

          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">New supplier</h2>
                  <p className="text-xs text-muted-foreground">Add supplier contact and ordering details.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => void handleSave()}
                    disabled={createSupplier.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium" htmlFor="supplier-name">
                      Name
                    </label>
                    <Input
                      id="supplier-name"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="supplier-contact">
                      Contact person
                    </label>
                    <Input
                      id="supplier-contact"
                      value={form.contactPerson ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, contactPerson: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="supplier-category">
                      Category
                    </label>
                    <Select
                      value={form.category}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, category: value as SupplierCategory }))
                      }
                    >
                      <SelectTrigger id="supplier-category">
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
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="supplier-email">
                      Email
                    </label>
                    <Input
                      id="supplier-email"
                      type="email"
                      value={form.email ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="supplier-phone">
                      Phone
                    </label>
                    <Input
                      id="supplier-phone"
                      value={form.phone ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="supplier-abn">
                      ABN
                    </label>
                    <Input
                      id="supplier-abn"
                      value={form.abn ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, abn: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="supplier-payment">
                      Payment terms
                    </label>
                    <Input
                      id="supplier-payment"
                      placeholder="e.g. Net 14"
                      value={form.paymentTerms ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, paymentTerms: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="supplier-delivery">
                      Delivery days
                    </label>
                    <Input
                      id="supplier-delivery"
                      placeholder="e.g. Mon, Wed, Fri"
                      value={form.deliveryDays ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, deliveryDays: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="supplier-order-method">
                      Order method
                    </label>
                    <Select
                      value={form.orderMethod || "Email"}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, orderMethod: value }))
                      }
                    >
                      <SelectTrigger id="supplier-order-method">
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
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="supplier-status">
                      Status
                    </label>
                    <Select
                      value={form.active ? "active" : "inactive"}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, active: value === "active" }))
                      }
                    >
                      <SelectTrigger id="supplier-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-start gap-3 space-y-0 md:col-span-2">
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
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="supplier-shared" className="text-sm font-medium leading-none">
                        Share with all venues in this organisation
                      </label>
                      <p className="text-xs text-muted-foreground">
                        When checked, this supplier appears for every venue under the organisation.
                      </p>
                    </div>
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
