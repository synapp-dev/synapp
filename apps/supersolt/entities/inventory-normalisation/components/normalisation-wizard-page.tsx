"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Carrot,
  Check,
  ChevronLeft,
  Loader2,
  Package,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";
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
import { useQuery } from "@tanstack/react-query";
import { cn } from "@workspace/ui/lib/utils";
import {
  WizardFrame,
  WizardFrameHeader,
  WizardViewport,
} from "@/components/molecules/wizard-frame";
import { inventoryNormalisationApi } from "@/entities/inventory-normalisation/api/endpoints";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { BRAND_BUTTON_CLASS } from "@/entities/inventory-setup/components/stage-intro-steps";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { buildScopedPath } from "@/lib/build-scoped-path";
import type { IngredientCategory } from "@/entities/ingredients/model/types";
import { useNormalisationQueueQuery } from "@/entities/inventory-normalisation/model/useNormalisationQueueQuery";
import { useNormalisationMutations } from "@/entities/inventory-normalisation/model/useNormalisationMutations";
import { descriptionsLikelySameProduct } from "@/server/inventory-normalisation/find-similar-pending-raw-items";
import { packSignatureForDescription } from "@/server/supplier-raw-items/review-clustering";
import type {
  NormalisationQueueItem,
  NormalisationSuggestion,
} from "@/entities/inventory-normalisation/model/types";

const CATEGORIES: Array<{ value: IngredientCategory; label: string }> = [
  { value: "proteins", label: "Proteins" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "dry-goods", label: "Dry goods" },
  { value: "beverages", label: "Beverages" },
  { value: "oils-condiments", label: "Oils & condiments" },
  { value: "other", label: "Other" },
];

type BaseUnit = "g" | "kg" | "mL" | "L" | "each";
// The pack question asks how much one non-metric pack (bag, bunch…) weighs or
// holds, so the answer must be a metric unit — "each" is intentionally excluded.
const METRIC_PACK_UNITS: Array<{ value: BaseUnit; label: string }> = [
  { value: "g", label: "grams (g)" },
  { value: "kg", label: "kilograms (kg)" },
  { value: "mL", label: "millilitres (mL)" },
  { value: "L", label: "litres (L)" },
];

const GREEN_FIELD =
  "border-emerald-400 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30 dark:border-emerald-500/60";

type FieldKey = "name" | "category" | "pack" | "price";
// The right card reveals these in order, one at a time, after the bot finishes.
const REVEAL_ORDER: FieldKey[] = ["name", "category", "pack", "price"];

function normUnit(raw: string): BaseUnit | null {
  switch (raw.trim().toLowerCase()) {
    case "kg":
    case "kgs":
      return "kg";
    case "g":
    case "gm":
    case "gram":
    case "grams":
      return "g";
    case "ml":
    case "mls":
      return "mL";
    case "l":
    case "lt":
    case "ltr":
    case "litre":
    case "litres":
      return "L";
    case "each":
    case "ea":
    case "unit":
    case "units":
    case "pc":
    case "pcs":
      return "each";
    default:
      return null;
  }
}

/** Pull a pack size out of a description ("Red Onion Peeled 10kg" → 10 kg). */
function parsePackSize(
  rawDescription: string,
  rawUnit: string | null,
): { unitsPerPack: number; packUnit: BaseUnit } | null {
  const u = normUnit(rawUnit ?? "");
  // Already a metric weight/volume: the unit price IS per this unit, so the pack
  // is "1 of it". A measurable figure baked into the description ("@160g") is a
  // per-piece size, NOT the pack — don't let it divide the price. It's surfaced
  // separately as the unit size (see parseUnitSize).
  if (u && u !== "each") return { unitsPerPack: 1, packUnit: u };
  // Non-metric ("each"/"bunch"…): quantify into metric from the description if it
  // states a size; otherwise leave it for the user / LLM to estimate.
  const m = rawDescription.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
  if (m) {
    const value = Number(m[1]);
    const unit = normUnit(m[2]!);
    if (value > 0 && unit) return { unitsPerPack: value, packUnit: unit };
  }
  return null;
}

/**
 * Pull a per-piece size out of invoice wording — "(150 Pieces @160g)" → 160 g.
 * Anchored on "@" so it captures the portion size, not a pack size like "10kg".
 * Mirrors the server's extractPackHint; informational only, never a cost divisor.
 */
function parseUnitSize(
  rawDescription: string,
): { size: number; unit: BaseUnit } | null {
  const m = rawDescription.match(/@\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);
  if (m) {
    const value = Number(m[1]);
    const unit = normUnit(m[2]!);
    if (value > 0 && unit) return { size: value, unit };
  }
  return null;
}

/** First per-piece size found across a product's variant descriptions. */
function parseUnitSizeFromGroup(
  descriptions: string[],
): { size: number; unit: BaseUnit } | null {
  for (const d of descriptions) {
    const hit = parseUnitSize(d);
    if (hit) return hit;
  }
  return null;
}

type GroupedQueueItem = NormalisationQueueItem & {
  /** Other variant raw-item ids, folded into this one at commit. */
  siblingIds: string[];
  /** Every variant description in the group (for unit-size seeding). */
  groupDescriptions: string[];
  /** Every variant in the group (base + siblings), for multi-pack pricing. */
  variants: NormalisationQueueItem[];
};

/**
 * Pick the costing-base variant for a group: prefer an "each"/singular pack, then
 * the cheapest line (smallest pack). The base drives the main ingredient form; the
 * rest become extra priced packs.
 */
function pickBaseVariantIndex(members: NormalisationQueueItem[]): number {
  let bestIdx = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  members.forEach((m, idx) => {
    const isEach = normUnit(m.rawUnit ?? "") === "each";
    // Lower is better: each beats non-each; ties broken by cheapest unit price.
    const score =
      (isEach ? 0 : 1_000_000_000) + (m.lastUnitPriceCents ?? Number.MAX_SAFE_INTEGER);
    if (score < bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });
  return bestIdx;
}


/**
 * Collapse the pending queue so each product is normalised once. Variants that are
 * the same product in different invoice wording / order quantities (same supplier,
 * prefix-matching description) fold into one representative — the bare product line
 * — carrying its siblings' ids so the commit marks them in one go. Mirrors the
 * supplier-items "N sizes" grouping the user already sees.
 */
function groupPendingQueueItems(
  items: NormalisationQueueItem[],
): GroupedQueueItem[] {
  // Shortest description first → the bare product line becomes the representative.
  const sorted = [...items].sort(
    (a, b) => a.rawDescription.length - b.rawDescription.length,
  );
  const groups: Array<{
    rep: NormalisationQueueItem;
    members: NormalisationQueueItem[];
  }> = [];
  for (const it of sorted) {
    const group = groups.find(
      (g) =>
        g.rep.supplierId === it.supplierId &&
        descriptionsLikelySameProduct(g.rep.rawDescription, it.rawDescription),
    );
    if (group) group.members.push(it);
    else groups.push({ rep: it, members: [it] });
  }
  return groups.map(({ members }) => {
    // The representative is the costing-base variant (each/smallest), not just the
    // shortest description — so recipe costs use the most granular pack.
    const base = members[pickBaseVariantIndex(members)]!;
    return {
      ...base,
      siblingIds: members.filter((m) => m.id !== base.id).map((m) => m.id),
      groupDescriptions: members.map((m) => m.rawDescription),
      variants: members,
    };
  });
}

/** A metric weight/volume the supplier sells in — these need no quantification. */
function isMetricUnit(u: BaseUnit | null): boolean {
  return u === "g" || u === "kg" || u === "mL" || u === "L";
}

/** True when the supplier unit (each, bunch, bag…) must be converted to metric. */
function needsMetricPack(rawUnit: string | null): boolean {
  return !isMetricUnit(normUnit(rawUnit ?? ""));
}

const CATEGORY_KEYWORDS: Array<[IngredientCategory, RegExp]> = [
  [
    "produce",
    /\b(onion|tomato|lettuce|carrot|potato|garlic|herb|basil|parsley|cucumber|spinach|mushroom|capsicum|lemon|lime|apple|fruit|veg|salad|rocket|kale|broccoli|cauliflower)\b/i,
  ],
  [
    "proteins",
    /\b(chicken|beef|pork|lamb|fish|seafood|poultry|breast|fillet|mince|sausage|prawn|bacon|ham|egg)\b/i,
  ],
  ["dairy", /\b(milk|cheese|cream|butter|yoghurt|yogurt|dairy|mozzarella|parmesan)\b/i],
  ["dry-goods", /\b(flour|sugar|rice|pasta|salt|spice|cereal|bread|bun)\b/i],
  ["beverages", /\b(wine|beer|juice|soda|water|coffee|tea|cola|lemonade)\b/i],
  ["oils-condiments", /\b(oil|vinegar|sauce|condiment|dressing|mayo|mustard)\b/i],
];

function guessCategory(rawDescription: string): IngredientCategory {
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(rawDescription)) return cat;
  }
  return "other";
}

function cleanIngredientName(rawDescription: string): string {
  return rawDescription
    .replace(/\b\d+(?:\.\d+)?\s*(kg|g|ml|l)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function dollarsToCents(value: string): number {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}
function centsToDollars(cents: number | null): string {
  return ((cents ?? 0) / 100).toFixed(2);
}

function perUnitPriceCents(item: NormalisationQueueItem): number | null {
  if (item.lastUnitPriceCents != null && item.lastUnitPriceCents > 0) {
    return item.lastUnitPriceCents;
  }
  if (
    item.lastLineTotalCents != null &&
    item.lastQuantity != null &&
    item.lastQuantity > 0
  ) {
    return Math.round(item.lastLineTotalCents / item.lastQuantity);
  }
  return item.lastLineTotalCents;
}

export function NormalisationWizardPage({
  organisation,
  venue,
}: {
  organisation: string;
  venue: string;
}) {
  const router = useRouter();
  const reduceMotion = usePrefersReducedMotion();
  const backPath = buildScopedPath(
    organisation,
    venue,
    "settings/inventory-setup/inventory",
  );

  const queueQuery = useNormalisationQueueQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const { suggest, commit, skip } = useNormalisationMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const [queue, setQueue] = useState<GroupedQueueItem[] | null>(null);
  // Snapshot the number of distinct products to normalise this run, so the header
  // reads "Item 3 of 12" over collapsed product groups (not raw quantity variants).
  const [progress, setProgress] = useState<{
    totalMain: number;
    doneBefore: number;
  } | null>(null);
  useEffect(() => {
    if (queue || !queueQuery.data) return;
    const main = queueQuery.data.items.filter((i) => i.bucket === "main");
    const pending = main.filter((i) => i.normalisationStatus === "pending");
    // Collapse quantity variants of the same product into one step.
    const groups = groupPendingQueueItems(pending);
    setQueue(groups);
    setProgress({
      totalMain: groups.length,
      doneBefore: 0,
    });
  }, [queue, queueQuery.data]);

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const total = queue?.length ?? 0;
  const item = queue?.[index] ?? null;
  // Counter spans the whole original set: completed-before + progress this run.
  const overallTotal = progress?.totalMain ?? total;
  const overallPosition = (progress?.doneBefore ?? 0) + index + 1;

  const [suggestions, setSuggestions] = useState<
    Record<string, NormalisationSuggestion>
  >({});
  const [suggestingId, setSuggestingId] = useState<string | null>(null);

  const currentSuggestion = item ? suggestions[item.id] : undefined;
  const suggestingThis = item != null && suggestingId === item.id;

  const fetchSuggestion = useCallback(
    async (it: NormalisationQueueItem, force = false) => {
      if (!force && suggestions[it.id]) return;
      setSuggestingId(it.id);
      try {
        const s = await suggest.mutateAsync({
          rawItemId: it.id,
          regenerate: force,
        });
        setSuggestions((prev) => ({ ...prev, [it.id]: s }));
      } catch {
        // Keep the algorithm defaults — manual entry still works.
      } finally {
        setSuggestingId((cur) => (cur === it.id ? null : cur));
      }
    },
    [suggest, suggestions],
  );

  // Per-item form state.
  const [ingredientName, setIngredientName] = useState("");
  const [category, setCategory] = useState<IngredientCategory>("other");
  const [packUnit, setPackUnit] = useState<BaseUnit>("g");
  const [unitsPerPack, setUnitsPerPack] = useState("1");
  // Per-piece size for metric-priced items (e.g. a 160 g fillet sold by the kg).
  // Informational — saved as the product's portion, never divides the price.
  const [unitSize, setUnitSize] = useState("");
  const [unitSizeUnit, setUnitSizeUnit] = useState<BaseUnit>("g");
  const [priceInput, setPriceInput] = useState("0.00");
  // The bot's typical-weight estimate for a non-metric pack, shown as a quiet
  // placeholder hint (not a committed value) when we can't infer the size.
  const [packGuess, setPackGuess] = useState<string | null>(null);
  // Editable pricing for the OTHER packs this product was invoiced under (e.g. a
  // "bag" alongside the base "each"). Keyed by the variant's raw-item id: how many
  // base units that pack holds, and its price. Each saves as its own product.
  const [extraPackInputs, setExtraPackInputs] = useState<
    Record<string, { units: string; price: string }>
  >({});

  // Which fields the bot filled (green + sparkle), cleared on manual edit. A ref
  // mirrors it so the async LLM refine never clobbers a field the user touched.
  const [botFields, setBotFields] = useState<Set<FieldKey>>(() => new Set());
  const botRef = useRef<Set<FieldKey>>(new Set());
  const packInputRef = useRef<HTMLInputElement>(null);

  // How many of the result fields have streamed in. Starts at 0 (bot "thinking"),
  // then climbs one field at a time once the suggestion settles.
  const [revealed, setRevealed] = useState(0);
  const showField = (key: FieldKey) => revealed > REVEAL_ORDER.indexOf(key);
  const isBot = (f: FieldKey) => botFields.has(f);
  const setBot = (fields: FieldKey[]) => {
    const next = new Set(fields);
    botRef.current = next;
    setBotFields(next);
  };
  const clearBot = (f: FieldKey) => {
    const next = new Set(botRef.current);
    next.delete(f);
    botRef.current = next;
    setBotFields(next);
  };

  // Seed instantly from the algorithm whenever the item changes, then ask the LLM.
  useEffect(() => {
    if (!item) return;
    const pack = parsePackSize(item.rawDescription, item.rawUnit);
    const unit = parseUnitSizeFromGroup(item.groupDescriptions);
    setIngredientName(cleanIngredientName(item.rawDescription));
    setCategory(guessCategory(item.rawDescription));
    setPackUnit(pack?.packUnit ?? "g");
    setUnitsPerPack(pack ? String(pack.unitsPerPack) : "");
    setUnitSize(unit ? String(unit.size) : "");
    setUnitSizeUnit(unit?.unit ?? "g");
    setPackGuess(null);
    setPriceInput(centsToDollars(perUnitPriceCents(item)));
    // Seed the other packs (everything in the group except the base variant) with
    // their invoiced price; units-per-pack starts blank for the user to confirm.
    const seededPacks: Record<string, { units: string; price: string }> = {};
    for (const v of item.variants) {
      if (v.id === item.id) continue;
      seededPacks[v.id] = { units: "", price: centsToDollars(v.lastUnitPriceCents) };
    }
    setExtraPackInputs(seededPacks);
    setBot(pack ? ["name", "category", "price", "pack"] : ["name", "category", "price"]);
    setRevealed(0);
    void fetchSuggestion(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  // Refine with the LLM suggestion once it lands — only for still-bot fields.
  useEffect(() => {
    if (!item || !currentSuggestion) return;
    const s = currentSuggestion;
    const bot = botRef.current;
    if (bot.has("name") && s.ingredientName?.trim()) {
      setIngredientName(s.ingredientName.trim());
    }
    if (bot.has("category") && s.ingredientCategory) setCategory(s.ingredientCategory);
    const needsPack = needsMetricPack(item.rawUnit);
    // Metric-priced items keep pack = "1 unit" (cost = price per that unit). Their
    // per-piece size comes deterministically from the "@160g" wording (seed) or, at
    // commit, the server's group-wide derivation — never the LLM's pack guess, which
    // would put a spurious size on plain metric lines. So only refine the pack here
    // for non-metric units, where the LLM's metric estimate IS the cost basis.
    if (bot.has("pack")) {
      if (needsPack && s.packUnit && s.packUnit !== "each") {
        // We inferred a metric pack from the description — let the LLM refine it,
        // but never downgrade to "each".
        setPackUnit(s.packUnit);
        if (s.unitsPerPack && s.unitsPerPack > 0) setUnitsPerPack(String(s.unitsPerPack));
      }
    } else if (needsPack && s.packUnit && s.packUnit !== "each") {
      // Couldn't infer the pack (e.g. "bunch"): use the LLM's typical-weight
      // lookup quietly — it seeds the starting unit and shows as a placeholder
      // hint, but the field stays blank so the user confirms the real number.
      setPackUnit(s.packUnit);
      if (s.unitsPerPack && s.unitsPerPack > 0) setPackGuess(String(s.unitsPerPack));
    }
    if (bot.has("price") && s.unitPriceCents != null) {
      setPriceInput(centsToDollars(s.unitPriceCents));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSuggestion]);

  // Stream the result fields in one at a time, but only once the bot has stopped
  // thinking — until then the right card holds skeletons so the work is visible.
  useEffect(() => {
    if (!item || !started) return;
    if (suggestingThis) return; // still fetching → keep the skeletons up
    if (revealed >= REVEAL_ORDER.length) return;
    if (reduceMotion) {
      setRevealed(REVEAL_ORDER.length);
      return;
    }
    const delay = revealed === 0 ? 220 : 360;
    const t = setTimeout(() => setRevealed((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [item?.id, started, suggestingThis, revealed, reduceMotion]);

  // Once the pack field has streamed in and it's the only thing left to answer
  // (name/category/price are bot-filled), drop the cursor straight into it.
  const packRevealed = revealed > REVEAL_ORDER.indexOf("pack");
  useEffect(() => {
    if (!item || !started || !packRevealed) return;
    const needsPack = needsMetricPack(item.rawUnit);
    const inferredPack = parsePackSize(item.rawDescription, item.rawUnit) !== null;
    const hasName = cleanIngredientName(item.rawDescription).trim().length > 0;
    if (!needsPack || inferredPack || !hasName) return;
    const raf = requestAnimationFrame(() => packInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, started, packRevealed]);

  if (queueQuery.isLoading || !queue) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  const done = () => {
    toast.success("Nice work — your items are normalised.");
    router.push(backPath);
  };
  const advance = () => {
    if (index + 1 >= total) return done();
    setIndex((i) => i + 1);
  };

  // No intro when there's nothing to build — fall through to the review pass.
  if (!started && total > 0) {
    return (
      <WizardIntro
        total={total}
        doneBefore={progress?.doneBefore ?? 0}
        reduceMotion={reduceMotion}
        onStart={() => setStarted(true)}
        onExit={() => router.push(backPath)}
      />
    );
  }

  if (!item) {
    // Nothing pending: re-entering the wizard becomes a REVIEW pass over what
    // was already normalised — read-only, data untouched.
    return (
      <NormalisationReview
        organisation={organisation}
        venue={venue}
        items={queueQuery.data?.items ?? []}
        onExit={() => router.push(backPath)}
      />
    );
  }

  const packLabel = item.rawUnit?.trim() || "each";
  // What we call the pack in copy: "unit" reads better than "Each"/"".
  const packNoun =
    normUnit(item.rawUnit ?? "") === "each" || !item.rawUnit?.trim()
      ? "unit"
      : packLabel.toLowerCase();
  // How we refer to one base unit when describing other packs ("1 bag = 5 each").
  const baseUnitNoun =
    normUnit(item.rawUnit ?? "") === "each" || !item.rawUnit?.trim()
      ? "each"
      : packLabel.toLowerCase();
  // The supplier's price for one pack is on the invoice, so show it (not ???).
  const detectedPriceCents = perUnitPriceCents(item);
  // Anything not already a metric weight/volume (each, bunch, bag…) must be
  // quantified into grams — including "each", which we can't track as-is.
  const needsPackQuestion = needsMetricPack(item.rawUnit);
  const unitsNum = Math.max(0, Number(unitsPerPack) || 0);
  const priceCents = dollarsToCents(priceInput);
  const canConfirm =
    ingredientName.trim().length > 0 && (!needsPackQuestion || unitsNum > 0);

  // Other packs this product was invoiced under (e.g. "bag" beside the base
  // "each"). Each is saved as its own priced product under the same ingredient.
  // Wording-drift twins — same parsed pack as the base ("box" vs "pack" on the
  // same 15-dozen eggs) — are excluded: they fold onto the base product via
  // alsoRawItemIds, contributing price history instead of a duplicate product.
  const baseSignature = packSignatureForDescription(item.rawDescription);
  const extraPacks = item.variants.filter(
    (v) =>
      v.id !== item.id &&
      packSignatureForDescription(v.rawDescription) !== baseSignature,
  );
  // Build the additionalPacks payload from the user's per-pack edits.
  const buildAdditionalPacks = () =>
    extraPacks.map((v) => {
      const input = extraPackInputs[v.id];
      const units = Math.max(0, Number(input?.units) || 0);
      return {
        rawItemId: v.id,
        supplierProduct: {
          name: v.rawDescription,
          packLabel: v.rawUnit?.trim() || "pack",
          unitsPerPack: units > 0 ? units : 1,
          packUnit: "each" as BaseUnit,
          unitPriceCents: dollarsToCents(input?.price ?? "0"),
        },
      };
    });

  const retry = () => {
    // Reset the pack to the algorithm's read (blank for non-metric units like
    // "bunch") so a regenerate can't relight a guess we can't actually make.
    const pack = parsePackSize(item.rawDescription, item.rawUnit);
    const unit = parseUnitSizeFromGroup(item.groupDescriptions);
    setPackUnit(pack?.packUnit ?? "g");
    setUnitsPerPack(pack ? String(pack.unitsPerPack) : "");
    setUnitSize(unit ? String(unit.size) : "");
    setUnitSizeUnit(unit?.unit ?? "g");
    setPackGuess(null);
    setBot(
      pack
        ? ["name", "category", "price", "pack"]
        : ["name", "category", "price"],
    );
    setRevealed(0);
    void fetchSuggestion(item, true);
  };

  const handleConfirm = () => {
    if (!canConfirm) {
      toast.error("Add a name (and pack size) before continuing.");
      return;
    }
    const perPack = unitsNum > 0 ? unitsNum : 1;
    const unitSizeNum = Number(unitSize);
    const portion =
      Number.isFinite(unitSizeNum) && unitSizeNum > 0
        ? { portionSize: unitSizeNum, portionUnit: unitSizeUnit, portionLabel: "piece" }
        : {};
    const name = ingredientName.trim();
    // Optimistic: fire the save and advance straight away. The outcome lands as a
    // bottom-left toast whenever the request settles, so the user never waits.
    commit.mutate(
      {
        rawItemId: item.id,
        mode: "create",
        ingredient: {
          name,
          category,
          unit: packUnit,
          costPerUnitCents: Math.round(priceCents / perPack),
          currentStockLevel: 0,
          status: "active",
          supplierId: item.supplierId,
        },
        supplierProduct: {
          name: item.rawDescription,
          packLabel,
          unitsPerPack: perPack,
          packUnit,
          unitPriceCents: priceCents,
          ...portion,
        },
        makeActiveSource: true,
        alsoRawItemIds: item.siblingIds,
        additionalPacks: extraPacks.length ? buildAdditionalPacks() : undefined,
      },
      {
        onSuccess: () =>
          toast.success(`${name} added to inventory.`, { position: "bottom-left" }),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : `Couldn't save ${name}.`, {
            position: "bottom-left",
          }),
      },
    );
    advance();
  };

  const handleSkip = () => {
    const name = ingredientName.trim() || item.rawDescription;
    skip.mutate(item.id, {
      onSuccess: () =>
        toast.success(`${name} moved to non-inventory.`, { position: "bottom-left" }),
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : `Couldn't move ${name}.`, {
          position: "bottom-left",
        }),
    });
    advance();
  };

  return (
    <WizardViewport className="px-4 pb-4">
      <WizardFrame
        className="max-w-4xl"
        header={
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Item {overallPosition} of {overallTotal}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground -mr-2 gap-1.5"
                onClick={() => router.push(backPath)}
              >
                <X className="h-4 w-4" aria-hidden />
                Exit
              </Button>
            </div>
            <Progress
              value={
                overallTotal === 0
                  ? 0
                  : Math.round(
                      (((progress?.doneBefore ?? 0) + index) / overallTotal) * 100,
                    )
              }
              className="h-2"
              indicatorStyle={{ backgroundColor: "var(--brand-supersolt-primary)" }}
            />
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={handleSkip}
            >
              Move to non-inventory
            </Button>
            <Button
              size="lg"
              className={BRAND_BUTTON_CLASS}
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              <Check className="h-4 w-4" aria-hidden />
              {index + 1 >= total ? "Confirm & finish" : "Confirm & next"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <AgentBotAvatarVideo
            aria-hidden
            poster="/images/supersolt-bot.png"
            className="h-full w-full"
          />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">
            From <span className="font-semibold">{item.supplierName}</span> —
            let&apos;s turn this into a trackable ingredient.
          </p>
          {item.siblingIds.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Covers {item.siblingIds.length + 1} pack sizes seen on invoices —
              normalise once.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
        <Card className="bg-muted/20 flex flex-col gap-4 overflow-hidden p-5">
          <div className="-mx-5 -mt-5 flex items-center gap-2 border-b bg-muted/60 px-5 py-3">
            <Package className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
            <span className="text-foreground text-sm font-semibold uppercase tracking-wide">
              Supplier item
            </span>
          </div>
          <ReadField
            label="Name"
            value={item.rawDescription}
            shown={showField("name")}
            reduceMotion={reduceMotion}
          />
          <ReadField
            label="Category"
            value="???"
            shown={showField("category")}
            reduceMotion={reduceMotion}
          />
          {needsPackQuestion ? (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Pack size</Label>
              {showField("pack") ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
                  <span className="shrink-0 whitespace-nowrap">
                    1 {packNoun} =
                  </span>
                  <div className="border-input bg-muted/40 flex h-9 flex-1 items-center rounded-md border px-3">
                    ?
                  </div>
                </div>
              ) : (
                <div
                  className="bg-muted h-9 w-full animate-pulse rounded-md"
                  aria-hidden
                />
              )}
            </div>
          ) : (
            <ReadField
              label="Pack size"
              value={`1 ${packNoun}`}
              shown={showField("pack")}
              reduceMotion={reduceMotion}
            />
          )}
          {!needsPackQuestion && unitSize.trim() ? (
            <ReadField
              label="Unit size"
              value={`${unitSize} ${unitSizeUnit}`}
              shown={showField("pack")}
              reduceMotion={reduceMotion}
            />
          ) : null}
          <ReadField
            label={`Price per ${packNoun}`}
            value={
              detectedPriceCents != null && detectedPriceCents > 0
                ? `$${centsToDollars(detectedPriceCents)}`
                : "???"
            }
            shown={showField("price")}
            reduceMotion={reduceMotion}
          />
        </Card>

        <div className="flex items-center justify-center">
          <span
            className={cn(
              "bg-[var(--brand-supersolt-primary)]/15 text-[var(--brand-supersolt-primary)] flex h-9 w-9 items-center justify-center rounded-full",
              suggestingThis && "motion-safe:animate-pulse",
            )}
          >
            {suggestingThis ? (
              <Sparkles className="h-5 w-5" aria-hidden />
            ) : (
              <ArrowRight className="h-5 w-5" aria-hidden />
            )}
          </span>
        </div>

        <Card className="flex flex-col gap-4 overflow-hidden border-[var(--brand-supersolt-primary)]/40 p-5">
          <div className="-mx-5 -mt-5 flex items-center justify-between border-b border-[var(--brand-supersolt-primary)]/40 bg-[var(--brand-supersolt-primary)]/20 px-5 py-3">
            <span className="text-[var(--brand-supersolt-primary-foreground)] flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
              <Carrot className="text-[var(--brand-supersolt-primary)] h-4 w-4 shrink-0" aria-hidden />
              Ingredient
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs"
                  disabled={suggestingThis}
                  onClick={retry}
                >
                  {suggestingThis ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                  {suggestingThis ? "Thinking…" : "Try again"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Ask superbot to try guessing again
              </TooltipContent>
            </Tooltip>
          </div>

          <ResultField
            label="Name"
            badge={isBot("name") ? <BotSparkle /> : null}
            shown={showField("name")}
          >
            <div className="relative">
              <StreamInput
                value={ingredientName}
                active={showField("name")}
                reduceMotion={reduceMotion}
                className={cn(isBot("name") && `pr-9 ${GREEN_FIELD}`)}
                onChange={(e) => {
                  setIngredientName(e.target.value);
                  clearBot("name");
                }}
              />
              {isBot("name") ? <InFieldSparkle /> : null}
            </div>
          </ResultField>

          <ResultField
            label="Category"
            badge={isBot("category") ? <BotSparkle /> : null}
            shown={showField("category")}
          >
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v as IngredientCategory);
                clearBot("category");
              }}
            >
              <SelectTrigger
                className={cn("w-full", isBot("category") && GREEN_FIELD)}
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
          </ResultField>

          {needsPackQuestion ? (
            <ResultField
              label="Pack size"
              badge={
                isBot("pack") ? (
                  <BotSparkle />
                ) : unitsNum <= 0 ? (
                  <NeedsInputBadge />
                ) : null
              }
              shown={showField("pack")}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0 whitespace-nowrap">
                  1 {packNoun} =
                </span>
                <Input
                  ref={packInputRef}
                  type="number"
                  min={0}
                  step="any"
                  placeholder={packGuess ? String(packGuess) : "?"}
                  className={cn(
                    "w-20 shrink-0",
                    isBot("pack")
                      ? GREEN_FIELD
                      : unitsNum <= 0 &&
                          "border-amber-300 focus-visible:border-amber-400 focus-visible:ring-amber-400/30 dark:border-amber-500/50",
                  )}
                  value={unitsPerPack}
                  onChange={(e) => {
                    setUnitsPerPack(e.target.value);
                    clearBot("pack");
                  }}
                />
                <Select
                  value={packUnit}
                  onValueChange={(v) => {
                    setPackUnit(v as BaseUnit);
                    clearBot("pack");
                  }}
                >
                  <SelectTrigger
                    className={cn("flex-1", isBot("pack") && GREEN_FIELD)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_PACK_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ResultField>
          ) : (
            <ResultField
              label="Unit size"
              badge={isBot("pack") && unitSize.trim() ? <BotSparkle /> : null}
              shown={showField("pack")}
            >
              <div className="flex items-center gap-2 text-sm">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="e.g. 160"
                  className={cn(
                    "w-24 shrink-0",
                    isBot("pack") && unitSize.trim() && GREEN_FIELD,
                  )}
                  value={unitSize}
                  onChange={(e) => {
                    setUnitSize(e.target.value);
                    clearBot("pack");
                  }}
                />
                <Select
                  value={unitSizeUnit}
                  onValueChange={(v) => {
                    setUnitSizeUnit(v as BaseUnit);
                    clearBot("pack");
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "flex-1",
                      isBot("pack") && unitSize.trim() && GREEN_FIELD,
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_PACK_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Size of one piece — for info and ordering. Doesn&apos;t change the
                price per {packNoun}.
              </p>
            </ResultField>
          )}

          <ResultField
            label={`Price per ${packNoun}`}
            badge={isBot("price") ? <BotSparkle /> : null}
            shown={showField("price")}
          >
            <div className="relative">
              <StreamInput
                value={priceInput}
                active={showField("price")}
                reduceMotion={reduceMotion}
                className={cn(isBot("price") && `pr-9 ${GREEN_FIELD}`)}
                onChange={(e) => {
                  setPriceInput(e.target.value);
                  clearBot("price");
                }}
              />
              {isBot("price") ? <InFieldSparkle /> : null}
            </div>
          </ResultField>

          {extraPacks.length > 0 && showField("price") ? (
            <div className="flex flex-col gap-3 border-t pt-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
              <div className="flex flex-col gap-0.5">
                <Label className="text-foreground">Other packs on invoices</Label>
                <p className="text-muted-foreground text-xs">
                  Also invoiced by the{" "}
                  {extraPacks
                    .map((v) => v.rawUnit?.trim() || "pack")
                    .join(" and ")}
                  . Saved as extra packs you can order by — the {baseUnitNoun} price
                  stays the costing base.
                </p>
              </div>
              {extraPacks.map((v) => {
                const input = extraPackInputs[v.id] ?? { units: "", price: "" };
                const label = v.rawUnit?.trim() || "pack";
                const update = (patch: Partial<{ units: string; price: string }>) =>
                  setExtraPackInputs((prev) => ({
                    ...prev,
                    [v.id]: { ...input, ...patch },
                  }));
                return (
                  <div key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0 whitespace-nowrap font-medium">
                      1 {label} =
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="?"
                      className="w-16 shrink-0"
                      value={input.units}
                      onChange={(e) => update({ units: e.target.value })}
                    />
                    <span className="text-muted-foreground shrink-0 whitespace-nowrap">
                      {baseUnitNoun}
                    </span>
                    <span className="text-muted-foreground shrink-0">·</span>
                    <span className="text-muted-foreground shrink-0">$</span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="w-20 shrink-0"
                      value={input.price}
                      onChange={(e) => update({ price: e.target.value })}
                    />
                    <span className="text-muted-foreground shrink-0 whitespace-nowrap text-xs">
                      / {label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>
      </div>

        </div>
      </WizardFrame>
    </WizardViewport>
  );
}

/** Reveals `text` one character at a time once `active` flips true. */
function useTypewriter(
  text: string,
  active: boolean,
  reduceMotion: boolean,
): string {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      setCount(text.length);
      return;
    }
    setCount(0);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
  }, [text, active, reduceMotion]);
  return text.slice(0, count);
}

/**
 * A read-only mirror field on the "Supplier item" card (often ??? until the bot
 * fills it). Holds a skeleton until its row reveals, then types its value in.
 */
function ReadField({
  label,
  value,
  shown,
  reduceMotion,
}: {
  label: string;
  value: string;
  shown: boolean;
  reduceMotion: boolean;
}) {
  const typed = useTypewriter(value, shown, reduceMotion);
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">{label}</Label>
      {shown ? (
        <div className="border-input bg-muted/40 text-muted-foreground flex h-9 items-center rounded-md border px-3 text-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <span className="truncate" title={value}>
            {typed || " "}
          </span>
        </div>
      ) : (
        <div
          className="bg-muted h-9 w-full animate-pulse rounded-md"
          aria-hidden
        />
      )}
    </div>
  );
}

/**
 * Text input that types its value out once its row reveals, then hands over to a
 * normal editable input — so bot-filled fields feel like they're being written.
 */
function StreamInput({
  value,
  active,
  reduceMotion,
  onChange,
  className,
}: {
  value: string;
  active: boolean;
  reduceMotion: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<"pending" | "typing" | "live">("pending");
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!active) {
      setPhase("pending");
      setTyped("");
      return;
    }
    if (reduceMotion) {
      setPhase("live");
      return;
    }
    const snapshot = value ?? "";
    setPhase("typing");
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(snapshot.slice(0, i));
      if (i >= snapshot.length) {
        clearInterval(id);
        setPhase("live");
      }
    }, 26);
    return () => clearInterval(id);
    // Snapshot the value at activation — don't re-type on later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion]);

  const live = phase === "live" || reduceMotion;
  return (
    <Input
      value={live ? value : typed}
      onChange={live ? onChange : undefined}
      readOnly={!live}
      className={className}
    />
  );
}

/**
 * An editable field on the "Ingredient" card. Holds a pulsing skeleton until the
 * bot finishes thinking, then streams the control in. The label carries a sparkle
 * (bot guess) or "Needs your input" badge.
 */
function ResultField({
  label,
  badge,
  shown,
  children,
}: {
  label: React.ReactNode;
  badge: React.ReactNode;
  shown: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        {label}
        {badge}
      </Label>
      {shown ? (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:duration-300">
          {children}
        </div>
      ) : (
        <div
          className="bg-muted h-9 w-full animate-pulse rounded-md"
          aria-hidden
        />
      )}
    </div>
  );
}

/** The green ✨ that pops in inside a bot-filled text input. */
function InFieldSparkle() {
  return (
    <Sparkles
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:spin-in-45 motion-safe:duration-500"
      aria-hidden
    />
  );
}


/** Amber pill flagging a field the bot couldn't fill — the user must answer it. */
function NeedsInputBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
      Needs your input
    </span>
  );
}

/** Sparkle marker shown next to a label the bot filled, with a hint on hover. */
function BotSparkle() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">
          <Sparkles
            className="h-3.5 w-3.5 text-emerald-500 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:spin-in-45 motion-safe:duration-500"
            aria-label="Superbot's guess"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>Superbot&apos;s guess</TooltipContent>
    </Tooltip>
  );
}

function WizardIntro({
  total,
  doneBefore,
  reduceMotion,
  onStart,
  onExit,
}: {
  total: number;
  doneBefore: number;
  reduceMotion: boolean;
  onStart: () => void;
  onExit: () => void;
}) {
  const resuming = doneBefore > 0;
  const heading = resuming
    ? "Ready to keep going?"
    : "Let's create your ingredients!";
  const message = resuming
    ? `${doneBefore} down, ${total} to go. I'll help you fill out the forms as much as I can — let's pick up where we left off.`
    : `I'll help you fill out the forms as much as I can — walking through your ${total} item${total === 1 ? "" : "s"} one at a time. Ready?`;
  const cta = resuming ? "Let's keep going" : "Let's start";
  const len = useStreamingText(message, "normalise-wizard-intro", reduceMotion, true);
  const shown = reduceMotion ? message : message.slice(0, len);
  const streaming = !reduceMotion && len < message.length;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-6 text-center">
      <span className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 dark:bg-emerald-950/40 sm:h-40 sm:w-40">
        <AgentBotAvatarVideo
          aria-hidden
          poster="/images/supersolt-bot.png"
          className="h-full w-full"
        />
      </span>
      <div
        className={cn(
          "flex flex-col gap-2",
          !reduceMotion && "animate-in fade-in slide-in-from-bottom-2 duration-500",
        )}
      >
        <p className="text-foreground text-xl font-semibold sm:text-2xl">
          {heading}
        </p>
        <p className="text-muted-foreground mx-auto max-w-md text-balance text-base" aria-live="polite">
          {shown}
          {streaming ? (
            <span
              className="bg-muted-foreground/60 ml-px inline-block h-[1.05em] w-px animate-pulse align-middle"
              aria-hidden
            />
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="text-muted-foreground" onClick={onExit}>
          Not now
        </Button>
        <Button size="lg" className={BRAND_BUTTON_CLASS} onClick={onStart}>
          <Sparkles className="h-4 w-4" aria-hidden />
          {cta}
        </Button>
      </div>
    </div>
  );
}

/**
 * Review pass over already-normalised items: walks one product at a time
 * showing the supplier line beside what it became (product pack + master
 * ingredient). Read-only — nothing here writes.
 */
function NormalisationReview({
  organisation,
  venue,
  items,
  onExit,
}: {
  organisation: string;
  venue: string;
  items: NormalisationQueueItem[];
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);

  // One entry per created product (variants share a supplierProductId).
  const reviewItems = (() => {
    const normalised = items.filter(
      (i) => i.bucket === "main" && i.normalisationStatus === "normalised",
    );
    const seen = new Set<string>();
    const deduped: NormalisationQueueItem[] = [];
    for (const item of normalised) {
      const key = item.supplierProductId ?? item.id;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    return deduped.sort(
      (a, b) =>
        a.supplierName.localeCompare(b.supplierName) ||
        a.rawDescription.localeCompare(b.rawDescription),
    );
  })();

  const exitButton = (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={onExit}>
      <X className="h-4 w-4" aria-hidden />
      Exit
    </Button>
  );

  if (reviewItems.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-sm">Nothing left to normalise.</p>
        <Button onClick={onExit}>Back to inventory</Button>
      </div>
    );
  }

  const current = reviewItems[Math.min(index, reviewItems.length - 1)]!;
  const isLast = index >= reviewItems.length - 1;

  return (
    <WizardViewport className="px-4 pb-4">
      <ReviewMappingFrame
        key={current.id}
        organisation={organisation}
        venue={venue}
        item={current}
        position={`Item ${index + 1} of ${reviewItems.length}`}
        exitButton={exitButton}
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </Button>
            <Button
              className={BRAND_BUTTON_CLASS}
              onClick={() => (isLast ? onExit() : setIndex((i) => i + 1))}
            >
              {isLast ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  Done
                </>
              ) : (
                "Next"
              )}
            </Button>
          </div>
        }
      />
    </WizardViewport>
  );
}

function ReviewMappingFrame({
  organisation,
  venue,
  item,
  position,
  exitButton,
  footer,
}: {
  organisation: string;
  venue: string;
  item: NormalisationQueueItem;
  position: string;
  exitButton: React.ReactNode;
  footer: React.ReactNode;
}) {
  const mappingQuery = useQuery({
    queryKey: ["normalisation-mapping", organisation, venue, item.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await inventoryNormalisationApi.get.mapping({
        organisationSlug: organisation,
        venueSlug: venue,
        rawItemId: item.id,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const mapping = mappingQuery.data;
  const fmt = (cents: number | null | undefined) =>
    cents == null
      ? "—"
      : `$${(cents / 100).toLocaleString("en-AU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

  return (
    <WizardFrame
      className="max-w-4xl"
      header={
        <WizardFrameHeader
          eyebrow={`Inventory · Review · ${position}`}
          title={item.rawDescription}
          titleExtra={
            <span className="text-muted-foreground text-sm">{item.supplierName}</span>
          }
          right={exitButton}
        />
      }
      footer={footer}
    >
      {mappingQuery.isLoading ? (
        <div
          className="text-muted-foreground flex items-center gap-2 py-10 text-sm"
          aria-busy="true"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading what this became…
        </div>
      ) : mappingQuery.isError ? (
        <p className="text-destructive py-6 text-sm">{mappingQuery.error.message}</p>
      ) : mapping ? (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Card className="bg-muted/20 flex flex-col gap-3 p-5">
            <div className="-mx-5 -mt-5 flex items-center gap-2 border-b bg-muted/60 px-5 py-3">
              <Package className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Supplier item
              </span>
            </div>
            <ReviewRow label="Invoice line" value={mapping.rawDescription} />
            <ReviewRow label="Invoiced as" value={mapping.rawUnit ?? "each"} />
            <ReviewRow label="Last price" value={fmt(mapping.lastUnitPriceCents)} />
            {mapping.product ? (
              <>
                <ReviewRow label="Product" value={mapping.product.name} />
                <ReviewRow
                  label="Pack"
                  value={`${mapping.product.unitsPerPack} ${mapping.product.packUnit} per ${mapping.product.packLabel} · ${fmt(mapping.product.unitPriceCents)}`}
                />
              </>
            ) : null}
          </Card>
          <Card className="flex flex-col gap-3 border-[var(--brand-supersolt-primary)]/40 p-5">
            <div className="-mx-5 -mt-5 flex items-center gap-2 border-b bg-muted/60 px-5 py-3">
              <Check className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Your ingredient
              </span>
            </div>
            {mapping.ingredient ? (
              <>
                <ReviewRow label="Name" value={mapping.ingredient.name} />
                <ReviewRow label="Category" value={mapping.ingredient.category} />
                <ReviewRow
                  label="Cost"
                  value={`${fmt(mapping.ingredient.costPerUnitCents)} / ${mapping.ingredient.unit}`}
                />
                <ReviewRow
                  label="On hand"
                  value={`${mapping.ingredient.currentStockLevel} ${mapping.ingredient.unit}`}
                />
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No ingredient linked — this line was skipped or moved to non-inventory.
              </p>
            )}
          </Card>
        </div>
      ) : null}
    </WizardFrame>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
