"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  CreditCard,
  FileText,
  Info,
  Loader2,
  Package,
  Phone,
  Plus,
  ShoppingCart,
  Truck,
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
import { Switch } from "@workspace/ui/components/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { addScheduleOverride, supplierDetailToUpsert } from "@/entities/suppliers/model/detail-helpers";
import { getDefaultDeliverySchedule } from "@/entities/suppliers/model/schedule-types";
import type { DeliveryScheduleEntry, ScheduleOverrideEntry } from "@/entities/suppliers/model/schedule-types";
import { useSupplierMutations } from "@/entities/suppliers/model/useSupplierMutations";
import { useSupplierQuery } from "@/entities/suppliers/model/useSupplierQuery";
import type { SupplierCategory, SupplierDetail } from "@/entities/suppliers/model/types";
import { useSupplierProductMutations } from "@/entities/supplier-products/model/useSupplierProductMutations";
import { useSupplierProductsQuery } from "@/entities/supplier-products/model/useSupplierProductsQuery";
import type { SupplierProductSummary } from "@/entities/supplier-products/model/types";
import { usePurchaseOrdersQuery } from "@/entities/purchase-orders/model/use-purchase-orders-query";
import { invoicesApi } from "@/entities/invoices/api/endpoints";
import { InvoiceDetailPanel } from "@/entities/invoices/components/invoice-detail-panel";
import { useQuery } from "@tanstack/react-query";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { DeliveryScheduleGrid } from "./delivery-schedule-grid";
import { SupplierProductFormSheet } from "./supplier-product-form-sheet";
import { SupplierItemsStep } from "./supplier-detail/supplier-items-step";
import { useSupplierRawItemsQuery } from "@/entities/supplier-raw-items/model/useSupplierRawItemsQuery";

type SupplierDetailPageClientProps = {
  organisation: string;
  venue: string;
  supplierId: string;
  /** Bottom sheet vs full page */
  variant?: "page" | "sheet";
  inventorySetupMode?: boolean;
  /** Called when closing the sheet (variant "sheet" only) */
  onClose?: () => void;
};

type StepId =
  | "information"
  | "contact"
  | "payment"
  | "delivery"
  | "items"
  | "products"
  | "invoices"
  | "orders";

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
  inventorySetupMode = false,
  onClose,
}: SupplierDetailPageClientProps) {
  const router = useRouter();
  const isSheet = variant === "sheet";
  const [activeStep, setActiveStep] = useState<StepId>("information");
  const [draft, setDraft] = useState<SupplierDetail | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    note: "",
  });
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProductSummary | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  const listPath = buildScopedPath(
    organisation,
    venue,
    inventorySetupMode ? "settings/inventory-setup/suppliers" : "purchasing/suppliers",
  );
  const ordersPath = buildScopedPath(organisation, venue, "purchasing/orders");
  const invoicesPath = buildScopedPath(organisation, venue, "purchasing/invoices");

  const supplierQuery = useSupplierQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });

  const productsQuery = useSupplierProductsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });

  const rawItemsQuery = useSupplierRawItemsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
    enabled: inventorySetupMode,
  });

  const ordersQuery = usePurchaseOrdersQuery({
    organisation,
    venue,
    supplierId,
  });

  const invoicesQuery = useQuery({
    queryKey: ["supplier-invoices", organisation, venue, supplierId],
    queryFn: async () => {
      const { data, error } = await invoicesApi.list({
        organisationSlug: organisation,
        venueSlug: venue,
        supplierId,
        view: "all",
      });
      if (error) throw new Error(error.message);
      return data?.invoices ?? [];
    },
  });

  const { updateSupplier, deleteSupplier } = useSupplierMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const { makeActive } = useSupplierProductMutations({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });

  const supplierProducts = productsQuery.data?.products ?? [];
  const productTotal = supplierProducts.length;
  const rawItemTotal = rawItemsQuery.data?.items.length ?? 0;
  const orders = ordersQuery.data?.orders ?? [];
  const invoices = invoicesQuery.data ?? [];

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
        orderingEmail: payload.orderingEmail?.trim() ?? "",
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

  async function handleArchive() {
    if (!draft) {
      return;
    }
    if (
      !confirm(
        `Archive ${draft.name}? Its products will be archived too. Purchase orders and invoices remain in history.`,
      )
    ) {
      return;
    }
    try {
      await deleteSupplier.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        supplierId,
      });
      toast.success("Supplier archived");
      if (onClose) {
        onClose();
      } else {
        router.push(listPath);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to archive");
    }
  }

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

  const steps: Array<{ id: StepId; label: string; icon: typeof Info; count?: number }> = [
    { id: "information", label: "Information", icon: Info },
    { id: "contact", label: "Contact", icon: Phone },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "delivery", label: "Delivery", icon: Truck },
    inventorySetupMode
      ? { id: "items", label: "Items", icon: Package, count: rawItemTotal }
      : { id: "products", label: "Products", icon: Package, count: productTotal },
    { id: "invoices", label: "Invoices", icon: FileText, count: invoices.length },
    ...(inventorySetupMode
      ? []
      : [{ id: "orders" as StepId, label: "Orders", icon: ShoppingCart, count: orders.length }]),
  ];

  const archiveButton = (
    <Button
      variant="destructive"
      size="sm"
      className="gap-1.5"
      disabled={deleteSupplier.isPending}
      onClick={() => void handleArchive()}
    >
      <Archive className="h-4 w-4" />
      Archive
    </Button>
  );

  const saveDetailsButton = (
    <div className="flex justify-end">
      <Button disabled={updateSupplier.isPending} onClick={() => void handleSaveDetails()}>
        Save
      </Button>
    </div>
  );

  const sidebarNav = (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 md:w-52 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3">
      {steps.map((step) => {
        const Icon = step.icon;
        const active = activeStep === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStep(step.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{step.label}</span>
            {step.count != null ? (
              <span className="text-muted-foreground text-xs tabular-nums">{step.count}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  const informationPanel = (
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
              setDraft((d) => (d ? { ...d, certificateExpiry: e.target.value || null } : d))
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
          placeholder="Supplier notes, delivery quirks, account numbers…"
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

      {saveDetailsButton}
    </Card>
  );

  const contactPanel = (
    <Card className="space-y-6 p-6">
      <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Contact &amp; address</h3>
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
          <Label htmlFor="sup-email">Contact email</Label>
          <Input
            id="sup-email"
            type="email"
            value={draft.email}
            onChange={(e) => setDraft((d) => (d ? { ...d, email: e.target.value } : d))}
          />
        </div>
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="sup-order-email">Ordering email</Label>
          <Input
            id="sup-order-email"
            type="email"
            placeholder="POs are sent to this address"
            value={draft.orderingEmail ?? ""}
            onChange={(e) => setDraft((d) => (d ? { ...d, orderingEmail: e.target.value } : d))}
          />
          <p className="text-xs text-muted-foreground">
            Purchase orders are emailed to this address from your venue inbox.
          </p>
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
            onValueChange={(v) => setDraft((d) => (d ? { ...d, state: v === "_none" ? "" : v } : d))}
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

      {saveDetailsButton}
    </Card>
  );

  const paymentPanel = (
    <Card className="space-y-6 p-6">
      <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Payment &amp; ordering</h3>
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
      </div>

      {saveDetailsButton}
    </Card>
  );

  const deliveryPanel = (
    <div className="space-y-4">
      <DeliveryScheduleGrid
        schedule={draft.deliverySchedule}
        disabled={updateSupplier.isPending}
        onChange={(schedule: DeliveryScheduleEntry[]) =>
          setDraft((d) => (d ? { ...d, deliverySchedule: schedule } : d))
        }
      />

      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="sup-delivery-days">Delivery days (free text)</Label>
          <Input
            id="sup-delivery-days"
            placeholder="e.g. Mon, Wed, Fri"
            value={draft.deliveryDays}
            onChange={(e) => setDraft((d) => (d ? { ...d, deliveryDays: e.target.value } : d))}
          />
        </div>
      </Card>

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
                : d,
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
                            : d,
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
    </div>
  );

  const productsPanel = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setEditingProduct(null);
            setProductSheetOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>
      <Card>
        {productsQuery.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading products…</div>
        ) : supplierProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No supplier products yet</h3>
            <p className="text-sm text-muted-foreground">
              Add SKUs with pack info, pricing, and ingredient mapping for accurate recipe costs.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingProduct(null);
                setProductSheetOpen(true);
              }}
            >
              Add first product
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Pack price</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[180px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.unitsPerPack} × {product.packUnit} ({product.packLabel})
                  </TableCell>
                  <TableCell>{product.ingredientName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(product.unitPriceCents)}
                  </TableCell>
                  <TableCell>
                    {product.isActiveForIngredient ? (
                      <Badge>Active source</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProduct(product);
                          setProductSheetOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {product.ingredientId && !product.isActiveForIngredient ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={makeActive.isPending}
                          onClick={() =>
                            void makeActive
                              .mutateAsync({ productId: product.id, propagateCost: true })
                              .then(() => toast.success("Active source updated"))
                              .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
                          }
                        >
                          Make active
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );

  const invoicesPanel = (
    <Card>
      {invoicesQuery.isLoading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading invoices…</div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No invoices yet</h3>
          <p className="text-sm text-muted-foreground">
            Invoices from this supplier appear after email intake or upload.
          </p>
          <Button asChild className="mt-4" variant="outline" size="sm">
            <Link href={invoicesPath}>Go to Invoices</Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Parsed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer"
                onClick={() => setPreviewInvoiceId(invoice.id)}
              >
                <TableCell className="font-medium">
                  {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                </TableCell>
                <TableCell>{invoice.invoiceDate ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={invoice.parseConfidence ? "default" : "secondary"}>
                    {invoice.parseConfidence ? "Parsed" : "Not parsed"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {invoice.reviewStatus.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(invoice.totalCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );

  const ordersPanel = (
    <Card>
      {ordersQuery.isLoading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center">
          <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No orders yet</h3>
          <p className="text-sm text-muted-foreground">
            Purchase orders to this supplier will appear here.
          </p>
          <Button asChild className="mt-4" variant="outline" size="sm">
            <Link href={ordersPath}>Go to Orders</Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected delivery</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.poNumber}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>{order.expectedDeliveryDate ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(order.totalCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );

  const activePanel = (() => {
    switch (activeStep) {
      case "information":
        return informationPanel;
      case "contact":
        return contactPanel;
      case "payment":
        return paymentPanel;
      case "delivery":
        return deliveryPanel;
      case "items":
        return (
          <SupplierItemsStep organisation={organisation} venue={venue} supplierId={supplierId} />
        );
      case "products":
        return productsPanel;
      case "invoices":
        return invoicesPanel;
      case "orders":
        return ordersPanel;
      default:
        return null;
    }
  })();

  const bodySection = (
    <>
      <div className="flex flex-col overflow-hidden rounded-lg border md:flex-row md:items-stretch">
        {sidebarNav}
        <div className="min-w-0 flex-1 p-4 md:p-5">{activePanel}</div>
      </div>

      <SupplierProductFormSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        organisation={organisation}
        venue={venue}
        supplierId={supplierId}
        product={editingProduct}
      />

      <InvoiceDetailPanel
        organisation={organisation}
        venue={venue}
        invoiceId={previewInvoiceId}
        onClose={() => setPreviewInvoiceId(null)}
      />
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
            {archiveButton}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-5">{bodySection}</div>
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
        <div className="flex flex-wrap gap-2">{archiveButton}</div>
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

      {bodySection}
    </section>
  );
}
