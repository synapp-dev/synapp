"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2, PackageX, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { SuperbotSpeechBubble } from "@/entities/inventory-setup/components/wizard/superbot-speech-bubble";
import { DeliveryScheduleGrid } from "@/entities/suppliers/components/delivery-schedule-grid";
import { WizardItemsApprovalStep } from "@/entities/suppliers/components/wizard-items-approval-step";
import { suppliersApi } from "@/entities/suppliers/api/endpoints";
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import { getDefaultDeliverySchedule } from "@/entities/suppliers/model/schedule-types";
import { useSupplierMutations } from "@/entities/suppliers/model/useSupplierMutations";
import { useSupplierQuery } from "@/entities/suppliers/model/useSupplierQuery";
import { useSuppliersQuery } from "@/entities/suppliers/model/useSuppliersQuery";
import { WIZARD_SUPPLIERS_LIST_FILTERS } from "@/entities/suppliers/model/wizard-query-input";
import type {
  DeliveryScheduleEntry,
  SupplierCategory,
  SupplierDetail,
  SupplierSummary,
  SupplierFieldSuggestions,
  UpsertSupplierInput,
} from "@/entities/suppliers/model/types";
import { buildScopedPath } from "@/lib/build-scoped-path";

// The green ring used on fields Superbot has filled in (mirrors normalisation).
const SUGGESTED_FIELD_CLASS =
  "border-emerald-400 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30 dark:border-emerald-500/60";

// The orange ring used to flag a required field that's still empty.
const REQUIRED_EMPTY_CLASS =
  "border-orange-400 focus-visible:border-orange-400 focus-visible:ring-orange-400/30 dark:border-orange-500/70";

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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mandatory fields that must be complete before leaving a supplier. Returns the
 * reason a supplier can't be saved yet (for the disabled-button tooltip), or
 * null when it's good to go. A contact email is only required while the supplier
 * is active — purchase orders are emailed there.
 */
function mandatoryFieldError(form: UpsertSupplierInput | null): string | null {
  if (!form) return null;
  if (!form.name.trim()) return "Add a supplier name before moving on.";
  if (form.active) {
    const email = form.email?.trim() ?? "";
    if (!email) return "Add a contact email — purchase orders are sent there.";
    if (!EMAIL_PATTERN.test(email)) return "Enter a valid contact email address.";
  }
  return null;
}

// The core details every supplier walks through.
const BASE_SECTIONS = [
  { id: "information", label: "Information" },
  { id: "contact", label: "Contact" },
  { id: "payment", label: "Payment" },
  { id: "delivery", label: "Delivery" },
] as const;
// Leading step shown only for suppliers with no detected items — confirm they
// actually deliver trackable items before collecting the rest of their details.
const ACTIVE_SECTION = { id: "active", label: "Active" } as const;
// Trailing recap shown only for suppliers that do have detected items.
const ITEMS_SECTION = { id: "items", label: "Items" } as const;

type SectionId =
  | "active"
  | "information"
  | "contact"
  | "payment"
  | "delivery"
  | "items";

const SECTION_HINT: Record<SectionId, string> = {
  active: "First — let's confirm whether this supplier belongs in your inventory.",
  information: "The basics — what they're called and what they supply.",
  contact: "Who do we reach, and where do orders get sent?",
  payment: "How you pay them, and how orders go out.",
  delivery: "Which days does this supplier deliver?",
  items:
    "Last thing — your inventory items are locked in. Just check I haven't wrongly flagged anything as non-inventory.",
};

// Pad/merge a stored schedule into a full Sun→Sat array so the grid always has
// seven entries to render, keyed by day index.
function normalizeSchedule(src: DeliveryScheduleEntry[] | undefined): DeliveryScheduleEntry[] {
  const base = getDefaultDeliverySchedule();
  const arr = Array.isArray(src) ? src : [];
  for (let i = 0; i < 7; i++) {
    const found = arr.find((x) => x.day === i) ?? arr[i];
    if (found && typeof found === "object") {
      base[i] = { ...base[i]!, ...found, day: i };
    }
  }
  return base;
}

function formFromDetail(d: SupplierDetail): UpsertSupplierInput {
  return {
    name: d.name,
    contactPerson: d.contactPerson,
    email: d.email,
    orderingEmail: d.orderingEmail ?? "",
    phone: d.phone,
    abn: d.abn,
    category: d.category,
    paymentTerms: d.paymentTerms,
    deliveryDays: d.deliveryDays,
    deliverySchedule: normalizeSchedule(d.deliverySchedule),
    scheduleOverrides: d.scheduleOverrides ?? [],
    orderMethod: d.orderMethod,
    active: d.active,
    sharedAcrossVenues: d.sharedAcrossVenues,
    addressLine1: d.addressLine1,
    addressLine2: d.addressLine2,
    suburb: d.suburb,
    state: d.state,
    postcode: d.postcode,
    country: d.country,
    isGstRegistered: d.isGstRegistered,
    haccpCertified: d.haccpCertified,
    certificateNumber: d.certificateNumber,
    certificateExpiry: d.certificateExpiry,
    notes: d.notes,
  };
}

/**
 * Guided, one-supplier-at-a-time setup. For each kept supplier we step through
 * Information → Contact → Payment → Delivery → Items, then move on to the next.
 * Each supplier is saved as we leave it, so navigating back shows saved values.
 */
export function SupplierConfigurationWizard({
  organisation,
  venue,
}: {
  organisation: string;
  venue: string;
}) {
  const router = useRouter();
  const suppliersListPath = buildScopedPath(
    organisation,
    venue,
    "settings/inventory-setup/suppliers",
  );

  const queryClient = useQueryClient();

  // Only active suppliers need setup — a supplier marked inactive on a previous
  // visit is excluded here, so we never re-ask about it.
  const suppliersQuery = useSuppliersQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    ...WIZARD_SUPPLIERS_LIST_FILTERS,
  });

  // Snapshot the list once when it first loads and walk that fixed queue. Saves
  // are optimistic and invalidate the suppliers query, which would otherwise
  // refetch and reshuffle the list mid-flow (e.g. drop a just-deactivated
  // supplier) and shift the supplier we're standing on.
  const [queue, setQueue] = useState<SupplierSummary[] | null>(null);
  useEffect(() => {
    if (queue === null && suppliersQuery.data) {
      setQueue(suppliersQuery.data.suppliers);
    }
  }, [queue, suppliersQuery.data]);
  const list = queue ?? [];
  const total = list.length;

  const [supplierIndex, setSupplierIndex] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  // Whether the current supplier's items step is ready to leave (the triage
  // list has loaded). Gates leaving the supplier. Reset on each supplier change.
  const [itemsReviewed, setItemsReviewed] = useState(false);
  // The Items step registers its one-shot triage confirm here; advanceSupplier
  // fires it when leaving the supplier — fire-and-forget, like the profile
  // save, so navigation never blocks on the network.
  const itemsConfirmRef = useRef<(() => void) | null>(null);
  const current = list[supplierIndex] ?? null;

  // "Detected" means anything parsed from this supplier's invoices — whether or
  // not it's been approved yet (approval happens later, in the Inventory stage).
  // A supplier with no detected items gets a leading "Active?" step so we can
  // confirm it belongs in the inventory before collecting the rest of its
  // details. Suppliers that do have items keep the natural flow and finish on
  // an Items recap. Both paths are five steps, so LAST_SECTION holds either way.
  const detectedItemCount =
    (current?.itemCount ?? 0) + (current?.unreviewedItemCount ?? 0);
  const sections =
    detectedItemCount === 0
      ? [ACTIVE_SECTION, ...BASE_SECTIONS]
      : [...BASE_SECTIONS, ITEMS_SECTION];
  const LAST_SECTION = sections.length - 1;

  const detailQuery = useSupplierQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId: current?.id ?? "",
  });
  const { updateSupplier } = useSupplierMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  // Seed the form from each supplier's detail when it arrives; re-seed only when
  // the supplier id changes so in-section edits aren't clobbered by refetches.
  const [form, setForm] = useState<UpsertSupplierInput | null>(null);
  const seededIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!current || !detailQuery.data) return;
    if (seededIdRef.current === current.id) return;
    setForm(formFromDetail(detailQuery.data));
    seededIdRef.current = current.id;
  }, [current, detailQuery.data]);

  // Superbot suggestions for empty fields (currently category), fetched lazily
  // and cached per supplier. `categorySuggested` flags that the value shown was
  // the bot's guess so we can paint it green until the user changes it.
  const [suggestionById, setSuggestionById] = useState<
    Record<string, SupplierFieldSuggestions>
  >({});
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [categorySuggested, setCategorySuggested] = useState(false);
  const appliedSuggestionIdRef = useRef<string | null>(null);
  // Request each supplier's suggestion exactly once. A ref (not state) is used so
  // re-renders never re-fire — and crucially never cancel — the in-flight call.
  const requestedIdsRef = useRef<Set<string>>(new Set());
  const suggestion = current ? suggestionById[current.id] : undefined;
  const suggestingCurrent = !!current && suggestingId === current.id;

  useEffect(() => {
    const supplierId = current?.id;
    if (!supplierId || requestedIdsRef.current.has(supplierId)) return;
    requestedIdsRef.current.add(supplierId);
    setSuggestingId(supplierId);
    void suppliersApi.patch
      .suggestSetupFields({
        organisationSlug: organisation,
        venueSlug: venue,
        supplierId,
      })
      .then(({ data }) => {
        if (data) {
          setSuggestionById((prev) => ({ ...prev, [supplierId]: data.suggestions }));
        }
      })
      .finally(() => {
        setSuggestingId((cur) => (cur === supplierId ? null : cur));
      });
  }, [current?.id, organisation, venue]);

  // Apply the suggestion into the form once, only for fields still at their
  // default/empty value, so we never overwrite real imported data.
  useEffect(() => {
    if (!current || !form || !suggestion) return;
    if (appliedSuggestionIdRef.current === current.id) return;
    appliedSuggestionIdRef.current = current.id;
    if (suggestion.category && form.category === "other") {
      const suggested = suggestion.category;
      setForm((f) => (f ? { ...f, category: suggested } : f));
      setCategorySuggested(true);
    }
  }, [current, form, suggestion]);

  const section = sections[sectionIndex]!;
  const isFirstStepOverall = supplierIndex === 0 && sectionIndex === 0;
  const isLastSupplier = supplierIndex === total - 1;
  const ready =
    !!current && !!form && seededIdRef.current === current.id;

  // On the Active step, "No, it doesn't" marks the supplier inactive — from
  // there the default action is to skip its remaining details and move to the
  // next supplier, with a ghost escape hatch to fill them out anyway.
  const skipRemaining = section.id === "active" && form?.active === false;
  const leavingSupplier = skipRemaining || sectionIndex === LAST_SECTION;
  const willFinish = leavingSupplier && isLastSupplier;

  // Block leaving a supplier until its mandatory fields are filled and — on the
  // Items step — the triage list has loaded (leaving mid-load would silently
  // skip any rescues). Only gates the leave action; stepping between this
  // supplier's own sections is always fine.
  const itemsGate =
    section.id === "items" && !itemsReviewed
      ? "One sec — still loading this supplier's items."
      : null;
  const blockReason = leavingSupplier ? (mandatoryFieldError(form) ?? itemsGate) : null;

  // When a section appears, focus the first field that needs input — preferring an
  // empty *required* field, then any empty field, so the user can start typing.
  const sectionBodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => {
      const root = sectionBodyRef.current;
      if (!root) return;
      const inputs = Array.from(root.querySelectorAll<HTMLInputElement>("input"));
      const target =
        inputs.find((el) => el.dataset.required === "true" && !el.value) ??
        inputs.find((el) => !el.value) ??
        inputs[0];
      target?.focus();
    }, 60);
    return () => window.clearTimeout(id);
  }, [supplierIndex, sectionIndex, ready]);

  function patch(next: Partial<UpsertSupplierInput>) {
    setForm((f) => (f ? { ...f, ...next } : f));
  }

  // Validate + trim the current form synchronously. Returns null (after a
  // toast) when something's wrong, so callers can bail before navigating.
  function buildValidPayload(): UpsertSupplierInput | null {
    if (!form) return null;
    const payload: UpsertSupplierInput = { ...form, name: form.name.trim() };
    if (!payload.name) {
      toast.error("Supplier name is required");
      return null;
    }
    if (payload.email && !EMAIL_PATTERN.test(payload.email.trim())) {
      toast.error("Enter a valid contact email address");
      return null;
    }
    return payload;
  }

  // Awaited save — used when stepping back, where we want the previous
  // supplier's values settled before we re-seed its form.
  async function persistCurrent(): Promise<boolean> {
    if (!current) return true;
    const payload = buildValidPayload();
    if (!payload) return false;
    try {
      await updateSupplier.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        supplierId: current.id,
        payload,
      });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save supplier");
      return false;
    }
  }

  // Fire-and-forget save so "Save & next supplier" feels instant. On failure we
  // surface a toast with a Retry that re-runs the same captured payload — the
  // user keeps moving and nothing is silently lost.
  function saveSupplierInBackground(
    supplierId: string,
    supplierName: string,
    payload: UpsertSupplierInput,
  ) {
    void suppliersApi.patch
      .update({ organisationSlug: organisation, venueSlug: venue, supplierId, payload })
      .then(({ error }) => {
        if (error) throw new Error(error.message);
        void queryClient.invalidateQueries({
          queryKey: suppliersKeys.scope(organisation, venue),
        });
      })
      .catch((error) => {
        toast.error(`Couldn't save ${supplierName}`, {
          description: error instanceof Error ? error.message : "Please try again.",
          action: {
            label: "Retry",
            onClick: () => saveSupplierInBackground(supplierId, supplierName, payload),
          },
        });
      });
  }

  // Optimistically persist whatever's filled in so far as the user steps between
  // a supplier's sections — no waiting, no blocking. Skips while the name is
  // empty (the server requires it) or the email is mid-typed/invalid, so we
  // don't fire doomed requests; the full save still runs on leave.
  function saveProgress() {
    if (!current || !form) return;
    const name = form.name.trim();
    if (!name) return;
    const email = form.email?.trim() ?? "";
    if (email && !EMAIL_PATTERN.test(email)) return;
    saveSupplierInBackground(current.id, name, { ...form, name });
  }

  function goToSupplier(nextIndex: number, atSection: number) {
    seededIdRef.current = null;
    setForm(null);
    setCategorySuggested(false);
    setItemsReviewed(false);
    itemsConfirmRef.current = null;
    setSupplierIndex(nextIndex);
    setSectionIndex(atSection);
  }

  // Save the current supplier optimistically and move straight on — either to
  // the next one or out of the wizard. Used both when finishing the last section
  // normally and when the user marks a no-item supplier inactive and skips its
  // remaining details. We don't wait on the network; saveSupplierInBackground
  // handles any failure.
  function advanceSupplier() {
    const payload = buildValidPayload();
    if (!payload) return;
    // Close out the items step: apply rescues + stamp the triage confirmed.
    // Fire-and-forget like the profile save; failures toast with a Retry.
    itemsConfirmRef.current?.();
    itemsConfirmRef.current = null;
    if (current) saveSupplierInBackground(current.id, payload.name, payload);
    if (supplierIndex < total - 1) {
      goToSupplier(supplierIndex + 1, 0);
      return;
    }
    toast.success("All suppliers set up");
    router.push(suppliersListPath);
  }

  function handleNext() {
    if (sectionIndex < LAST_SECTION) {
      saveProgress();
      setSectionIndex((s) => s + 1);
      return;
    }
    advanceSupplier();
  }

  async function handleBack() {
    if (sectionIndex > 0) {
      saveProgress();
      setSectionIndex((s) => s - 1);
      return;
    }
    if (supplierIndex > 0) {
      // Save edits before stepping back to the previous supplier's last section.
      const ok = await persistCurrent();
      if (!ok) return;
      goToSupplier(supplierIndex - 1, LAST_SECTION);
    }
  }

  // Empty / loading / error guards.
  if (suppliersQuery.isError) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-destructive text-sm">{suppliersQuery.error.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(suppliersListPath)}>
          Back to suppliers
        </Button>
      </div>
    );
  }
  if (queue === null) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }
  if (total === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-sm font-medium">No suppliers to set up yet</p>
        <Button className="mt-4" onClick={() => router.push(suppliersListPath)}>
          Back to suppliers
        </Button>
      </div>
    );
  }

  const saving = updateSupplier.isPending;

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 py-4",
        // The Items step is a two-pane review table + invoice preview, so it
        // needs more room than the narrow form steps.
        section.id === "items" ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      {/* Header: progress + skip */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Supplier setup
          </p>
          <h1 className="text-lg font-semibold">
            {current?.name ?? "Supplier"}{" "}
            <span className="text-muted-foreground text-sm font-normal">
              · {supplierIndex + 1} of {total}
            </span>
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push(suppliersListPath)}
        >
          I&apos;ll finish later
        </Button>
      </div>

      {/* Bot + section hint */}
      <div className="flex items-start gap-4">
        <AgentBotAvatarVideo aria-hidden className="size-14 shrink-0" />
        <SuperbotSpeechBubble tail="left" className="flex-1">
          <p className="text-sm leading-relaxed">
            {section.id === "active"
              ? `First up — I couldn't find any items from ${current?.name ?? "this supplier"}'s invoices. Do they actually deliver items you want to track?`
              : SECTION_HINT[section.id]}
          </p>
        </SuperbotSpeechBubble>
      </div>

      {/* Section stepper */}
      <div className="flex items-center gap-2">
        {sections.map((s, i) => {
          const state = i < sectionIndex ? "done" : i === sectionIndex ? "current" : "todo";
          return (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  state === "done" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  state === "current" && "bg-[var(--brand-supersolt-primary)] text-black",
                  state === "todo" && "bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs sm:inline",
                  state === "current" ? "font-medium" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Section body */}
      <Card className="p-6">
        {!ready ? (
          <div className="flex min-h-[14rem] items-center justify-center">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : (
          <div
            key={`${supplierIndex}:${sectionIndex}`}
            ref={sectionBodyRef}
            className="animate-in fade-in slide-in-from-right-2 duration-200"
          >
            {section.id === "information" ? (
              <InformationSection
                form={form!}
                patch={patch}
                categorySuggested={categorySuggested}
                categorySuggesting={suggestingCurrent && !categorySuggested}
                onCategoryUserChange={() => setCategorySuggested(false)}
              />
            ) : section.id === "contact" ? (
              <ContactSection form={form!} patch={patch} />
            ) : section.id === "payment" ? (
              <PaymentSection form={form!} patch={patch} />
            ) : section.id === "delivery" ? (
              <DeliverySection form={form!} patch={patch} />
            ) : section.id === "items" ? (
              current ? (
                <WizardItemsApprovalStep
                  key={current.id}
                  organisation={organisation}
                  venue={venue}
                  supplierId={current.id}
                  supplierName={current.name}
                  onAllReviewedChange={setItemsReviewed}
                  onRegisterConfirm={(fn) => {
                    itemsConfirmRef.current = fn;
                  }}
                />
              ) : null
            ) : (
              <SupplierActiveSection
                supplierName={current?.name ?? "This supplier"}
                deliversItems={form!.active}
                onChoose={(delivers) => patch({ active: delivers })}
              />
            )}
          </div>
        )}
      </Card>

      {/* Footer nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => void handleBack()}
          disabled={isFirstStepOverall || saving}
          className="text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {skipRemaining ? (
            <Button
              variant="ghost"
              onClick={() => void handleNext()}
              disabled={!ready || saving}
              className="text-muted-foreground"
            >
              I want to fill these details out anyway
            </Button>
          ) : null}
          {blockReason ? (
            <Tooltip>
              {/* Wrapper span so the tooltip still fires over the disabled button. */}
              <TooltipTrigger asChild>
                <span className="inline-flex" tabIndex={0}>
                  <Button
                    disabled
                    className="gap-1.5 bg-[var(--brand-supersolt-primary)] text-black hover:bg-[var(--brand-supersolt-primary)]/90"
                  >
                    {willFinish ? <Sparkles className="size-4" /> : null}
                    {isLastSupplier ? "Finish" : "Save & next supplier"}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {blockReason}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              onClick={() => void (skipRemaining ? advanceSupplier() : handleNext())}
              disabled={!ready || saving}
              className="gap-1.5 bg-[var(--brand-supersolt-primary)] text-black hover:bg-[var(--brand-supersolt-primary)]/90"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : willFinish ? (
                <Sparkles className="size-4" />
              ) : null}
              {leavingSupplier
                ? isLastSupplier
                  ? "Finish"
                  : "Save & next supplier"
                : "Next"}
              {!saving && !leavingSupplier ? <ArrowRight className="size-4" /> : null}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type SectionProps = {
  form: UpsertSupplierInput;
  patch: (next: Partial<UpsertSupplierInput>) => void;
};

function InformationSection({
  form,
  patch,
  categorySuggested,
  categorySuggesting,
  onCategoryUserChange,
}: SectionProps & {
  categorySuggested: boolean;
  categorySuggesting: boolean;
  onCategoryUserChange: () => void;
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="cfg-name">
          Supplier name <span className="text-orange-500">*</span>
        </FieldLabel>
        <Input
          id="cfg-name"
          data-required="true"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          className={cn(!form.name.trim() && REQUIRED_EMPTY_CLASS)}
        />
      </Field>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="cfg-category" className="flex items-center gap-1.5">
            Category
            {categorySuggesting ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-normal">
                <Loader2 className="size-3 animate-spin" />
                Superbot&apos;s thinking…
              </span>
            ) : categorySuggested ? (
              <span
                className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600 dark:text-emerald-400"
                title="Superbot's guess — change it if it's wrong"
              >
                <Sparkles className="size-3.5" aria-hidden />
                Superbot&apos;s guess
              </span>
            ) : null}
          </FieldLabel>
          <Select
            value={form.category}
            onValueChange={(v) => {
              patch({ category: v as SupplierCategory });
              onCategoryUserChange();
            }}
          >
            <SelectTrigger
              id="cfg-category"
              className={cn("w-full", categorySuggested && SUGGESTED_FIELD_CLASS)}
            >
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
        </Field>
        <Field>
          <FieldLabel htmlFor="cfg-abn">ABN</FieldLabel>
          <Input
            id="cfg-abn"
            inputMode="numeric"
            placeholder="11 digit ABN"
            value={form.abn ?? ""}
            onChange={(e) => patch({ abn: e.target.value })}
          />
          <FieldDescription>Helps us match incoming invoices to this supplier.</FieldDescription>
        </Field>
      </div>
    </FieldGroup>
  );
}

function ContactSection({ form, patch }: SectionProps) {
  return (
    <FieldGroup>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="cfg-contact">Contact person</FieldLabel>
          <Input
            id="cfg-contact"
            value={form.contactPerson ?? ""}
            onChange={(e) => patch({ contactPerson: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="cfg-phone">Phone</FieldLabel>
          <Input
            id="cfg-phone"
            type="tel"
            value={form.phone ?? ""}
            onChange={(e) => patch({ phone: e.target.value })}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="cfg-email">
          Contact email <span className="text-orange-500">*</span>
        </FieldLabel>
        <Input
          id="cfg-email"
          type="email"
          data-required="true"
          placeholder="orders@supplier.com"
          value={form.email ?? ""}
          onChange={(e) => patch({ email: e.target.value })}
          className={cn(!form.email?.trim() && REQUIRED_EMPTY_CLASS)}
        />
        <FieldDescription>
          Purchase orders are emailed here — add it so we can send orders automatically.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="cfg-addr1">Address line 1</FieldLabel>
        <Input
          id="cfg-addr1"
          value={form.addressLine1 ?? ""}
          onChange={(e) => patch({ addressLine1: e.target.value })}
        />
      </Field>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="cfg-suburb">Suburb</FieldLabel>
          <Input
            id="cfg-suburb"
            value={form.suburb ?? ""}
            onChange={(e) => patch({ suburb: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="cfg-state">State</FieldLabel>
          <Select
            value={form.state || "_none"}
            onValueChange={(v) => patch({ state: v === "_none" ? "" : v })}
          >
            <SelectTrigger id="cfg-state" className="w-full">
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
          <FieldLabel htmlFor="cfg-postcode">Postcode</FieldLabel>
          <Input
            id="cfg-postcode"
            inputMode="numeric"
            value={form.postcode ?? ""}
            onChange={(e) => patch({ postcode: e.target.value })}
          />
        </Field>
      </div>
    </FieldGroup>
  );
}

function PaymentSection({ form, patch }: SectionProps) {
  return (
    <FieldGroup>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="cfg-order-method">Order method</FieldLabel>
          <Select
            value={form.orderMethod || "Email"}
            onValueChange={(v) => patch({ orderMethod: v })}
          >
            <SelectTrigger id="cfg-order-method" className="w-full">
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
          <FieldLabel htmlFor="cfg-payment">Payment terms</FieldLabel>
          <Input
            id="cfg-payment"
            placeholder="e.g. Net 14"
            value={form.paymentTerms ?? ""}
            onChange={(e) => patch({ paymentTerms: e.target.value })}
          />
        </Field>
      </div>
      <Field orientation="horizontal">
        <Checkbox
          id="cfg-shared"
          checked={form.sharedAcrossVenues}
          onCheckedChange={(c) => patch({ sharedAcrossVenues: c === true })}
        />
        <FieldContent>
          <FieldLabel htmlFor="cfg-shared">Share with all venues in this organisation</FieldLabel>
          <FieldDescription>
            When checked, this supplier appears for every venue under the organisation.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

function DeliverySection({ form, patch }: SectionProps) {
  return (
    <div className="space-y-2">
      <DeliveryScheduleGrid
        schedule={form.deliverySchedule ?? getDefaultDeliverySchedule()}
        onChange={(schedule) => patch({ deliverySchedule: schedule })}
      />
      <p className="text-muted-foreground text-xs">
        Tick the days you place orders, then set the cut-off time and the day it
        arrives. We use these to time your order reminders.
      </p>
    </div>
  );
}

function SupplierActiveSection({
  supplierName,
  deliversItems,
  onChoose,
}: {
  supplierName: string;
  deliversItems: boolean;
  onChoose: (delivers: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <PackageX className="size-5 text-amber-600 dark:text-amber-400" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">
            We didn&apos;t find any items for {supplierName}.
          </p>
          <p className="text-muted-foreground text-sm">
            Are you sure this is a supplier that delivers items you want to track?
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChoose(true)}
          className={cn(
            "rounded-xl border p-3 text-left text-sm transition-colors",
            deliversItems
              ? "border-[var(--brand-supersolt-primary)] bg-[var(--brand-supersolt-primary)]/10"
              : "hover:bg-muted/50",
          )}
        >
          <p className="font-medium">Yes, it delivers items</p>
          <p className="text-muted-foreground text-xs">
            I&apos;ll add its items later in the Inventory stage.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChoose(false)}
          className={cn(
            "rounded-xl border p-3 text-left text-sm transition-colors",
            !deliversItems
              ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
              : "hover:bg-muted/50",
          )}
        >
          <p className="font-medium">No, it doesn&apos;t</p>
          <p className="text-muted-foreground text-xs">
            Mark it inactive so it won&apos;t show as needing setup.
          </p>
        </button>
      </div>
    </div>
  );
}
