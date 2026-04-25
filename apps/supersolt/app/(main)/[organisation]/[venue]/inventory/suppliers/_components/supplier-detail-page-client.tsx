"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Loader2,
  Package,
  ShoppingCart,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { addScheduleOverride, supplierDetailToUpsert } from "@/entities/suppliers/model/detail-helpers";
import { getDefaultDeliverySchedule } from "@/entities/suppliers/model/schedule-types";
import type { DeliveryScheduleEntry, ScheduleOverrideEntry } from "@/entities/suppliers/model/schedule-types";
import { useIngredientsQuery } from "@/entities/ingredients/model/useIngredientsQuery";
import { useSupplierMutations } from "@/entities/suppliers/model/useSupplierMutations";
import { useSupplierQuery } from "@/entities/suppliers/model/useSupplierQuery";
import type { SupplierCategory, SupplierDetail } from "@/entities/suppliers/model/types";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { DeliveryScheduleGrid } from "./delivery-schedule-grid";

type SupplierDetailPageClientProps = {
  organisation: string;
  venue: string;
  supplierId: string;
  /** Bottom sheet vs full page */
  variant?: "page" | "sheet";
  /** Called when closing the sheet (variant "sheet" only) */
  onClose?: () => void;
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

const PAYMENT_TERMS_OPTIONS = [
  { value: "cod", label: "COD" },
  { value: "net-7", label: "Net 7" },
  { value: "net-14", label: "Net 14" },
  { value: "net-30", label: "Net 30" },
  { value: "eom", label: "EOM" },
] as const;

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function normalizeSupplierDetail(raw: SupplierDetail): SupplierDetail {
  const baseSchedule = getDefaultDeliverySchedule();
  const src = Array.isArray(raw.deliverySchedule) ? raw.deliverySchedule : [];
  for (let i = 0; i < 7; i++) {
    const found = src.find((x) => x.day === i) ?? src[i];
    if (found && typeof found === "object") {
      baseSchedule[i] = { ...baseSchedule[i], ...found, day: i };
    }
  }
  return {
    ...raw,
    deliverySchedule: baseSchedule,
    scheduleOverrides: Array.isArray(raw.scheduleOverrides) ? raw.scheduleOverrides : [],
  };
}

function paymentTermsSelectValue(terms: string): string {
  const hit = PAYMENT_TERMS_OPTIONS.find((o) => o.value === terms);
  return hit ? terms : "custom";
}

export function SupplierDetailPageClient({
  organisation,
  venue,
  supplierId,
  variant = "page",
  onClose,
}: SupplierDetailPageClientProps) {
  const router = useRouter();
  const isSheet = variant === "sheet";
  const [activeTab, setActiveTab] = useState("details");
  const [draft, setDraft] = useState<SupplierDetail | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    note: "",
  });

  const listPath = buildScopedPath(organisation, venue, "inventory/suppliers");
  const ingredientsPath = buildScopedPath(organisation, venue, "catalog/ingredients");

  const supplierQuery = useSupplierQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });

  const ingredientsForSupplier = useIngredientsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
    page: 1,
    pageSize: 200,
  });

  const { updateSupplier, deleteSupplier } = useSupplierMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const productTotal = ingredientsForSupplier.data?.total ?? 0;
  const supplierProducts = ingredientsForSupplier.data?.ingredients ?? [];

  useLayoutEffect(() => {
    if (supplierQuery.data) {
      setDraft(normalizeSupplierDetail(supplierQuery.data));
    }
  }, [supplierQuery.data]);

  async function persistDraft(next: SupplierDetail) {
    const payload = supplierDetailToUpsert(next);
    await updateSupplier.mutateAsync({
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      payload: {
        ...payload,
        name: payload.name.trim(),
        contactPerson: payload.contactPerson?.trim() ?? "",
        email: payload.email?.trim() ?? "",
        phone: payload.phone?.trim() ?? "",
        abn: payload.abn?.trim() ?? "",
        paymentTerms: payload.paymentTerms?.trim() ?? "",
        deliveryDays: payload.deliveryDays?.trim() ?? "",
        orderMethod: payload.orderMethod?.trim() ?? "",
      },
    });
  }

  async function handleSaveDetails() {
    if (!draft) {
      return;
    }
    if (!draft.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    try {
      await persistDraft(draft);
      toast.success("Supplier saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleSaveSchedule() {
    if (!draft) {
      return;
    }
    try {
      await persistDraft(draft);
      toast.success("Schedule saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save schedule");
    }
  }

  async function handleDelete() {
    if (!draft) {
      return;
    }
    if (!confirm(`Delete ${draft.name}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteSupplier.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        supplierId,
      });
      toast.success("Supplier deleted");
      if (onClose) {
        onClose();
      } else {
        router.push(listPath);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const spendMetrics = useMemo(
    () => ({
      orderCount: 0,
      thisMonthCents: 0,
      lastMonthCents: 0,
      allTimeCents: 0,
    }),
    []
  );

  if (supplierQuery.isLoading || !draft) {
    if (supplierQuery.isError) {
      const errorBody = (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-10">
          <p className="text-center text-sm text-destructive">{supplierQuery.error.message}</p>
          {isSheet ? (
            <Button variant="outline" size="sm" type="button" onClick={() => onClose?.()}>
              Close
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href={listPath}>Back to suppliers</Link>
            </Button>
          )}
        </div>
      );
      if (isSheet) {
        return <div className="flex min-h-[200px] flex-col">{errorBody}</div>;
      }
      return <section className="flex min-h-[50vh] flex-col">{errorBody}</section>;
    }
    const loadingBody = (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading supplier…</p>
      </div>
    );
    if (isSheet) {
      return <div className="flex min-h-[200px] flex-col">{loadingBody}</div>;
    }
    return <section className="flex min-h-[50vh] flex-col">{loadingBody}</section>;
  }

  const ptSelect = paymentTermsSelectValue(draft.paymentTerms);

  const deleteButton = (
    <Button
      variant="destructive"
      size="sm"
      className="gap-1.5"
      disabled={deleteSupplier.isPending}
      onClick={() => void handleDelete()}
    >
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );

  const statsAndTabs = (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Products</p>
          <p className="text-2xl font-semibold tabular-nums">{productTotal}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Orders</p>
          <p className="text-2xl font-semibold tabular-nums">{spendMetrics.orderCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">This month</p>
          <p className="text-2xl font-semibold tabular-nums">{formatCurrency(spendMetrics.thisMonthCents)}</p>
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Last month</p>
          <p className="text-lg font-medium tabular-nums">{formatCurrency(spendMetrics.lastMonthCents)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">All time</p>
          <p className="text-lg font-medium tabular-nums">{formatCurrency(spendMetrics.allTimeCents)}</p>
        </Card>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="details" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5">
            <Package className="h-4 w-4" />
            Products ({productTotal})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="prices" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Prices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-4">
          <Card className="space-y-6 p-6">
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Supplier details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sup-name">Name *</Label>
                <Input
                  id="sup-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-abn">ABN</Label>
                <Input
                  id="sup-abn"
                  value={draft.abn}
                  onChange={(e) => setDraft((d) => (d ? { ...d, abn: e.target.value } : d))}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) =>
                    setDraft((d) => (d ? { ...d, category: v as SupplierCategory } : d))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="sup-gst"
                  checked={draft.isGstRegistered}
                  onCheckedChange={(v) => setDraft((d) => (d ? { ...d, isGstRegistered: v } : d))}
                />
                <Label htmlFor="sup-gst">GST registered</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="sup-active"
                  checked={draft.active}
                  onCheckedChange={(v) => setDraft((d) => (d ? { ...d, active: v } : d))}
                />
                <Label htmlFor="sup-active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="sup-haccp"
                  checked={draft.haccpCertified}
                  onCheckedChange={(v) => setDraft((d) => (d ? { ...d, haccpCertified: v } : d))}
                />
                <Label htmlFor="sup-haccp">HACCP certified</Label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sup-contact">Contact</Label>
                <Input
                  id="sup-contact"
                  value={draft.contactPerson}
                  onChange={(e) => setDraft((d) => (d ? { ...d, contactPerson: e.target.value } : d))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-phone">Phone</Label>
                <Input
                  id="sup-phone"
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => (d ? { ...d, phone: e.target.value } : d))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-email">Email</Label>
                <Input
                  id="sup-email"
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => (d ? { ...d, email: e.target.value } : d))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sup-addr1">Address line 1</Label>
              <Input
                id="sup-addr1"
                value={draft.addressLine1}
                onChange={(e) => setDraft((d) => (d ? { ...d, addressLine1: e.target.value } : d))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-addr2">Address line 2</Label>
              <Input
                id="sup-addr2"
                value={draft.addressLine2}
                onChange={(e) => setDraft((d) => (d ? { ...d, addressLine2: e.target.value } : d))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sup-suburb">Suburb</Label>
                <Input
                  id="sup-suburb"
                  value={draft.suburb}
                  onChange={(e) => setDraft((d) => (d ? { ...d, suburb: e.target.value } : d))}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select
                  value={draft.state || "_none"}
                  onValueChange={(v) =>
                    setDraft((d) => (d ? { ...d, state: v === "_none" ? "" : v } : d))
                  }
                >
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-pc">Postcode</Label>
                <Input
                  id="sup-pc"
                  value={draft.postcode}
                  onChange={(e) => setDraft((d) => (d ? { ...d, postcode: e.target.value } : d))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-country">Country</Label>
              <Input
                id="sup-country"
                value={draft.country}
                onChange={(e) => setDraft((d) => (d ? { ...d, country: e.target.value } : d))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment terms</Label>
                <Select
                  value={ptSelect}
                  onValueChange={(v) => {
                    if (v === "custom") {
                      return;
                    }
                    setDraft((d) => (d ? { ...d, paymentTerms: v } : d));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {ptSelect === "custom" ? (
                  <Input
                    className="mt-2"
                    placeholder="Describe terms"
                    value={draft.paymentTerms}
                    onChange={(e) => setDraft((d) => (d ? { ...d, paymentTerms: e.target.value } : d))}
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Order method</Label>
                <Select
                  value={draft.orderMethod || "Email"}
                  onValueChange={(v) => setDraft((d) => (d ? { ...d, orderMethod: v } : d))}
                >
                  <SelectTrigger>
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sup-delivery-days">Delivery days</Label>
                <Input
                  id="sup-delivery-days"
                  placeholder="e.g. Mon, Wed, Fri"
                  value={draft.deliveryDays}
                  onChange={(e) => setDraft((d) => (d ? { ...d, deliveryDays: e.target.value } : d))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sup-cert">Certificate number</Label>
                <Input
                  id="sup-cert"
                  value={draft.certificateNumber}
                  onChange={(e) => setDraft((d) => (d ? { ...d, certificateNumber: e.target.value } : d))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-cert-exp">Certificate expiry</Label>
                <Input
                  id="sup-cert-exp"
                  type="date"
                  value={draft.certificateExpiry ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, certificateExpiry: e.target.value || null } : d
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sup-notes">Notes</Label>
              <Textarea
                id="sup-notes"
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft((d) => (d ? { ...d, notes: e.target.value } : d))}
              />
            </div>

            <div className="flex items-start gap-3">
              <Switch
                id="sup-share"
                checked={draft.sharedAcrossVenues}
                onCheckedChange={(v) => setDraft((d) => (d ? { ...d, sharedAcrossVenues: v } : d))}
              />
              <div>
                <Label htmlFor="sup-share">Share with all venues</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, this supplier is visible to every venue under the organisation.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button disabled={updateSupplier.isPending} onClick={() => void handleSaveDetails()}>
                Save details
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 space-y-4">
          <DeliveryScheduleGrid
            schedule={draft.deliverySchedule}
            disabled={updateSupplier.isPending}
            onChange={(schedule: DeliveryScheduleEntry[]) =>
              setDraft((d) => (d ? { ...d, deliverySchedule: schedule } : d))
            }
          />

          <Card className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm font-semibold">Schedule overrides</Label>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  value={overrideForm.name}
                  onChange={(e) => setOverrideForm((o) => ({ ...o, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Input
                  type="date"
                  value={overrideForm.start_date}
                  onChange={(e) => setOverrideForm((o) => ({ ...o, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Input
                  type="date"
                  value={overrideForm.end_date}
                  onChange={(e) => setOverrideForm((o) => ({ ...o, end_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Note</Label>
                <Input
                  value={overrideForm.note}
                  onChange={(e) => setOverrideForm((o) => ({ ...o, note: e.target.value }))}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!overrideForm.name.trim() || !overrideForm.start_date || !overrideForm.end_date) {
                  toast.error("Name, start, and end dates are required");
                  return;
                }
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        scheduleOverrides: addScheduleOverride(d.scheduleOverrides, {
                          name: overrideForm.name.trim(),
                          start_date: overrideForm.start_date,
                          end_date: overrideForm.end_date,
                          note: overrideForm.note.trim(),
                        }),
                      }
                    : d
                );
                setOverrideForm({ name: "", start_date: "", end_date: "", note: "" });
              }}
            >
              Add override
            </Button>

            {draft.scheduleOverrides.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.scheduleOverrides.map((row: ScheduleOverrideEntry) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.start_date}</TableCell>
                      <TableCell>{row.end_date}</TableCell>
                      <TableCell className="text-muted-foreground">{row.note || "—"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() =>
                            setDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    scheduleOverrides: d.scheduleOverrides.filter((x) => x.id !== row.id),
                                  }
                                : d
                            )
                          }
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No overrides yet.</p>
            )}
          </Card>

          <div className="flex justify-end">
            <Button disabled={updateSupplier.isPending} onClick={() => void handleSaveSchedule()}>
              Save schedule
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
          <Card>
            {ingredientsForSupplier.isLoading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Loading products…</div>
            ) : supplierProducts.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No products</h3>
                <p className="text-sm text-muted-foreground">
                  No ingredients are linked to this supplier yet.
                </p>
                <Button asChild className="mt-4" variant="outline" size="sm">
                  <Link href={ingredientsPath}>Manage ingredients</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={ingredientsPath}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {categoryLabel(product.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(product.costPerUnitCents)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.status === "active" ? "default" : "secondary"}>
                          {product.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-4">
          <Card className="p-12 text-center">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No orders yet</h3>
            <p className="text-sm text-muted-foreground">
              Order history will appear once purchase orders are created.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="prices" className="mt-4 space-y-4">
          <Card className="p-12 text-center">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No price history</h3>
            <p className="text-sm text-muted-foreground">
              Price trends will appear once ingredient costs are tracked over time.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );

  if (isSheet) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="gap-1.5 shrink-0"
                onClick={() => onClose?.()}
              >
                <X className="h-4 w-4" />
                Close
              </Button>
              <h2 className="min-w-0 truncate text-lg font-semibold tracking-tight">{draft.name}</h2>
              <Badge variant={draft.active ? "default" : "secondary"} className="shrink-0">
                {draft.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {deleteButton}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-5">{statsAndTabs}</div>
      </div>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link href={listPath}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{draft.name}</h1>
          <Badge variant={draft.active ? "default" : "secondary"}>
            {draft.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">{deleteButton}</div>
      </div>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={listPath}>Suppliers</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{draft.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {statsAndTabs}
    </section>
  );
}
