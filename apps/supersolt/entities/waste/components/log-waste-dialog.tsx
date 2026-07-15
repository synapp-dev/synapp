"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { WASTE_REASONS } from "@/lib/waste/reasons";
import { useIngredientSelectorQuery } from "@/entities/ingredients/model/useIngredientsQuery";
import { useRecipesQuery } from "@/entities/recipes/model/useRecipesQuery";
import {
  useLogWasteBulkMutation,
  useLogWasteMutation,
} from "@/entities/waste/model/use-waste-query";
import type { CreateWasteEntryInput } from "@/entities/waste/model/types";

type WasteItemOption = {
  kind: "ingredient" | "batch";
  id: string;
  name: string;
  /** Base unit for ingredients; "serves" for batches. */
  unit: string;
  /** Cents per base unit (ingredients only; batch cost is server-derived). */
  costPerUnitCents: number | null;
};

type WasteLine = {
  key: number;
  item: WasteItemOption | null;
  qty: string;
  unit: string;
};

/**
 * Client-side mirror of the unit families the quantity picker offers.
 * The server (server/consumption/units.ts) remains the authority; this
 * only drives the unit dropdown and the live cost preview.
 */
const UNIT_FAMILIES: Record<string, { options: string[]; toBase: Record<string, number> }> = {
  g: { options: ["g", "kg"], toBase: { g: 1, kg: 1000 } },
  kg: { options: ["kg", "g"], toBase: { kg: 1, g: 0.001 } },
  ml: { options: ["ml", "l"], toBase: { ml: 1, l: 1000 } },
  l: { options: ["l", "ml"], toBase: { l: 1, ml: 0.001 } },
  each: { options: ["each", "dozen"], toBase: { each: 1, dozen: 12 } },
};

function unitOptionsFor(item: WasteItemOption): string[] {
  if (item.kind === "batch") return ["serves", "each"];
  const base = item.unit.toLowerCase();
  const family = UNIT_FAMILIES[base];
  return family ? family.options : [base];
}

/** Unit pre-filled when an item is picked; matches unitOptionsFor casing. */
function defaultUnitFor(item: WasteItemOption): string {
  return item.kind === "batch" ? "serves" : item.unit.toLowerCase();
}

/** Convert qty in `unit` to the item's base unit; null when unknown. */
function toBaseQty(item: WasteItemOption, qty: number, unit: string): number | null {
  if (unit.toLowerCase() === item.unit.toLowerCase()) return qty;
  const family = UNIT_FAMILIES[item.unit.toLowerCase()];
  const factor = family?.toBase[unit.toLowerCase()];
  return factor !== undefined ? qty * factor : null;
}

function previewCostCents(line: WasteLine): number | null {
  if (!line.item || line.item.costPerUnitCents === null) return null;
  const qty = Number(line.qty);
  if (!Number.isFinite(qty) || qty === 0) return null;
  const baseQty = toBaseQty(line.item, qty, line.unit);
  return baseQty === null ? null : Math.round(baseQty * line.item.costPerUnitCents);
}

function formatCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

let nextLineKey = 1;

function emptyLine(): WasteLine {
  return { key: nextLineKey++, item: null, qty: "", unit: "" };
}

function ItemCombobox({
  options,
  isLoading,
  value,
  onSelect,
}: {
  options: WasteItemOption[];
  isLoading: boolean;
  value: WasteItemOption | null;
  onSelect: (item: WasteItemOption) => void;
}) {
  const [open, setOpen] = useState(false);

  const ingredientOptions = options.filter((o) => o.kind === "ingredient");
  const batchOptions = options.filter((o) => o.kind === "batch");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="flex items-center gap-2 truncate">
              {value.kind === "batch" ? <Layers className="size-3.5 shrink-0 text-muted-foreground" /> : null}
              {value.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Search ingredient or batch…</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type to search…" />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading…" : "No items found."}</CommandEmpty>
            {ingredientOptions.length > 0 ? (
              <CommandGroup heading="Ingredients">
                {ingredientOptions.map((option) => (
                  <CommandItem
                    key={`ingredient-${option.id}`}
                    value={`${option.name} ingredient`}
                    onSelect={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value?.kind === "ingredient" && value.id === option.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span className="truncate">{option.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{option.unit}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {batchOptions.length > 0 ? (
              <CommandGroup heading="Batches & recipes">
                {batchOptions.map((option) => (
                  <CommandItem
                    key={`batch-${option.id}`}
                    value={`${option.name} batch`}
                    onSelect={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value?.kind === "batch" && value.id === option.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <Layers className="mr-2 size-3.5 text-muted-foreground" />
                    <span className="truncate">{option.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function LogWasteDialog({
  organisation,
  venue,
  open,
  onOpenChange,
  initialItem,
}: {
  organisation: string;
  venue: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select an item (quick-log chips), resolved against loaded options. */
  initialItem?: { kind: "ingredient" | "batch"; id: string } | null;
}) {
  const [bulkMode, setBulkMode] = useState(false);
  const [lines, setLines] = useState<WasteLine[]>([emptyLine()]);
  const [reason, setReason] = useState<string>("spoilage");
  const [note, setNote] = useState("");

  const ingredientsQuery = useIngredientSelectorQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const recipesQuery = useRecipesQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    status: "published",
    page: 1,
    pageSize: 1000,
  });

  const options = useMemo<WasteItemOption[]>(() => {
    const ingredientOptions: WasteItemOption[] = (ingredientsQuery.data ?? []).map(
      (i) => ({
        kind: "ingredient",
        id: i.id,
        name: i.name,
        unit: i.unit,
        costPerUnitCents: i.costPerUnitCents,
      }),
    );
    const batchOptions: WasteItemOption[] = (recipesQuery.data?.recipes ?? []).map(
      (r) => ({
        kind: "batch",
        id: r.id,
        name: r.name,
        unit: "serves",
        costPerUnitCents: null,
      }),
    );
    return [...ingredientOptions, ...batchOptions];
  }, [ingredientsQuery.data, recipesQuery.data]);

  const logMutation = useLogWasteMutation({ organisation, venue });
  const bulkMutation = useLogWasteBulkMutation({ organisation, venue });
  const isSaving = logMutation.isPending || bulkMutation.isPending;

  function resetForm() {
    setLines([emptyLine()]);
    setReason("spoilage");
    setNote("");
    setBulkMode(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  // Apply the quick-log chip pre-selection when the dialog opens with one.
  const [appliedInitialKey, setAppliedInitialKey] = useState<string | null>(null);
  const initialKey = initialItem ? `${initialItem.kind}:${initialItem.id}` : null;
  const resolvedInitial = initialItem
    ? options.find((o) => o.kind === initialItem.kind && o.id === initialItem.id)
    : undefined;
  if (open && resolvedInitial && initialKey !== appliedInitialKey) {
    setAppliedInitialKey(initialKey);
    setLines([
      { key: nextLineKey++, item: resolvedInitial, qty: "", unit: defaultUnitFor(resolvedInitial) },
    ]);
  }
  if (!open && appliedInitialKey !== null) {
    setAppliedInitialKey(null);
  }

  function setLine(key: number, patch: Partial<WasteLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  const activeLines = bulkMode ? lines : lines.slice(0, 1);
  const validLines = activeLines.filter(
    (l) => l.item && Number.isFinite(Number(l.qty)) && Number(l.qty) !== 0,
  );
  const canSave = validLines.length > 0 && validLines.length === activeLines.length;

  const totalPreviewCents = activeLines.reduce<number | null>((sum, line) => {
    const cents = previewCostCents(line);
    if (cents === null) return sum;
    return (sum ?? 0) + cents;
  }, null);

  async function handleSave() {
    const entries: CreateWasteEntryInput[] = validLines.map((line) => ({
      ingredientId: line.item!.kind === "ingredient" ? line.item!.id : null,
      recipeId: line.item!.kind === "batch" ? line.item!.id : null,
      qty: Number(line.qty),
      unit: line.unit || line.item!.unit,
      reason,
      note: note.trim() || null,
    }));

    try {
      if (entries.length === 1) {
        await logMutation.mutateAsync(entries[0]!);
        const line = validLines[0]!;
        const cents = previewCostCents(line);
        toast.success(
          `Logged ${line.qty} ${line.unit || line.item!.unit} ${line.item!.name}${
            cents !== null ? ` · ${formatCents(cents)}` : ""
          }`,
        );
      } else {
        await bulkMutation.mutateAsync(entries);
        toast.success(`Logged ${entries.length} waste lines`);
      }
      handleOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log waste");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-6">
            <DialogTitle>Log waste</DialogTitle>
            <label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              Bulk entry
              <Switch
                checked={bulkMode}
                onCheckedChange={(checked) => {
                  setBulkMode(checked);
                  if (!checked) setLines((prev) => prev.slice(0, 1));
                }}
              />
            </label>
          </div>
          <DialogDescription>
            {bulkMode
              ? "Add multiple items in one go; they save together with a shared reason."
              : "What got thrown out? Cost is calculated automatically."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {activeLines.map((line) => (
            <div key={line.key} className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <ItemCombobox
                    options={options}
                    isLoading={ingredientsQuery.isLoading || recipesQuery.isLoading}
                    value={line.item}
                    onSelect={(item) => setLine(line.key, { item, unit: defaultUnitFor(item) })}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      placeholder="Qty"
                      value={line.qty}
                      onChange={(e) => setLine(line.key, { qty: e.target.value })}
                      className="w-28"
                    />
                    <Select
                      value={line.unit || undefined}
                      onValueChange={(v) => setLine(line.key, { unit: v })}
                      disabled={!line.item}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {(line.item ? unitOptionsFor(line.item) : []).map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {previewCostCents(line) !== null ? (
                      <span className="ml-auto whitespace-nowrap text-sm font-medium text-muted-foreground">
                        {formatCents(previewCostCents(line)!)}
                      </span>
                    ) : line.item?.kind === "batch" ? (
                      <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                        cost auto
                      </span>
                    ) : null}
                  </div>
                </div>
                {bulkMode && lines.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 size-8 shrink-0 p-0 text-muted-foreground"
                    onClick={() =>
                      setLines((prev) => prev.filter((l) => l.key !== line.key))
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}

          {bulkMode ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus className="mr-1 size-3.5" />
              Add line
            </Button>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Reason
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {WASTE_REASONS.map((r) => (
                <Badge
                  key={r.value}
                  variant={reason === r.value ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => setReason(r.value)}
                >
                  {r.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Notes <span className="normal-case">(optional)</span>
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. fridge 2 was left open overnight"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center gap-3 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {totalPreviewCents !== null && bulkMode
              ? `Total ~${formatCents(totalPreviewCents)}`
              : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canSave || isSaving} onClick={() => void handleSave()}>
              {isSaving ? "Saving…" : bulkMode ? `Save ${validLines.length || ""} lines` : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { WasteItemOption };
