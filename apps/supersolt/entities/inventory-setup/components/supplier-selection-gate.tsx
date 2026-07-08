"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";

import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import type { SelectableSupplier } from "@/entities/inventory-setup/model/types";

const INITIAL_DELAY_MS = 500;
const MIN_STAGGER_MS = 90;
const MAX_STAGGER_MS = 320;
const REVEAL_BUDGET_MS = 5000; // cap the whole reveal at ~5s regardless of count

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/** Small typewriter for the speech bubble. Restarts whenever `text` changes. */
function useTypewriter(text: string, enabled: boolean): string {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) window.clearInterval(id);
    }, 18);
    return () => window.clearInterval(id);
  }, [text, enabled]);
  return text.slice(0, n);
}

function SupplierTile({
  supplier,
  checked,
  disabled,
  onToggle,
  animate,
}: {
  supplier: SelectableSupplier;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  animate: boolean;
}) {
  return (
    <label
      title={supplier.classificationReason ?? supplier.email ?? supplier.phone ?? undefined}
      className={cn(
        "bg-card flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
        disabled ? "cursor-default" : "hover:bg-muted/50 cursor-pointer",
        animate && "animate-in fade-in zoom-in-95 duration-300",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="truncate text-sm">{supplier.name}</span>
        {supplier.classificationReason ? (
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
            {supplier.classificationReason}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function SkeletonTile() {
  return (
    <div className="bg-card/60 flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-2.5">
      <div className="bg-muted size-4 shrink-0 animate-pulse rounded-sm" />
      <div className="bg-muted h-3.5 w-2/3 animate-pulse rounded" />
    </div>
  );
}

/**
 * The supplier gate. Suppliers arrive pre-sorted by Xero account coding: ones
 * billed to Direct Costs (ingredient spend) are pre-ticked in the main grid;
 * ones billed only to overheads are tucked into a collapsed "auto-excluded"
 * section, unticked, so the user confirms a smart default instead of triaging a
 * blank list. The inventory grid streams in one tile at a time while Superbot
 * narrates; selection unlocks once the reveal lands.
 */
export function SupplierSelectionGate({
  suppliers,
  isSubmitting,
  onSubmit,
}: {
  suppliers: SelectableSupplier[];
  isSubmitting: boolean;
  onSubmit: (supplierIds: string[]) => void | Promise<void>;
}) {
  const reduceMotion = usePrefersReducedMotion();

  // Split by suggestion; the inventory group drives the reveal, overheads sit
  // in the collapsed disclosure below.
  const { inventory, excluded } = useMemo(() => {
    const inv: SelectableSupplier[] = [];
    const exc: SelectableSupplier[] = [];
    for (const s of suppliers) (s.suggestedInventory ? inv : exc).push(s);
    return { inventory: inv, excluded: exc };
  }, [suppliers]);

  const total = suppliers.length;
  const revealTarget = inventory.length;
  const idsKey = useMemo(() => suppliers.map((s) => s.id).join(","), [suppliers]);

  const [revealed, setRevealed] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [excludedOpen, setExcludedOpen] = useState(false);
  const timersRef = useRef<number[]>([]);

  // (Re)start the reveal whenever the supplier set changes. Pre-select only the
  // suggested-inventory suppliers.
  useEffect(() => {
    for (const id of timersRef.current) window.clearTimeout(id), window.clearInterval(id);
    timersRef.current = [];
    setSelected(new Set(inventory.map((s) => s.id)));
    setRevealed(0);

    if (revealTarget === 0) return;
    if (reduceMotion) {
      setRevealed(revealTarget);
      return;
    }

    const stagger = Math.min(
      MAX_STAGGER_MS,
      Math.max(MIN_STAGGER_MS, Math.floor(REVEAL_BUDGET_MS / revealTarget)),
    );
    let count = 0;
    const startId = window.setTimeout(() => {
      const intervalId = window.setInterval(() => {
        count += 1;
        setRevealed(count);
        if (count >= revealTarget) window.clearInterval(intervalId);
      }, stagger);
      timersRef.current.push(intervalId);
    }, INITIAL_DELAY_MS);
    timersRef.current.push(startId);

    return () => {
      for (const id of timersRef.current) window.clearTimeout(id), window.clearInterval(id);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, reduceMotion]);

  const complete = revealTarget === 0 || revealed >= revealTarget;
  const allInventorySelected =
    inventory.length > 0 && inventory.every((s) => selected.has(s.id));

  // How many suppliers we're about to keep have no contact email at all — needed
  // later for auto-ordering. Shown once as a summary, not as per-tile noise.
  const missingEmailCount = useMemo(
    () =>
      suppliers.filter(
        (s) => selected.has(s.id) && !s.email && !s.orderingEmail,
      ).length,
    [suppliers, selected],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setAllInventory = (on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of inventory) {
        if (on) next.add(s.id);
        else next.delete(s.id);
      }
      return next;
    });

  const message = !complete
    ? "Sorting your suppliers…"
    : total === 0
      ? "Hmm — I couldn't find any suppliers in Xero."
      : excluded.length > 0
        ? `Pre-selected ${inventory.length} ingredient supplier${inventory.length === 1 ? "" : "s"} and set aside ${excluded.length} that look like overheads. Adjust if I got any wrong, then parse.`
        : `Found ${inventory.length} supplier${inventory.length === 1 ? "" : "s"}. Untick any that don't deliver ingredients, then hit parse.`;
  const typed = useTypewriter(message, !reduceMotion);

  return (
    <div className="space-y-4">
      {/* Superbot + one steady speech bubble */}
      <div className="flex items-end gap-3">
        <AgentBotAvatarVideo className="size-16 shrink-0" />
        <div className="bg-muted relative mb-1 max-w-xl rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
          {typed}
          {!complete ? <span className="ml-0.5 inline-block animate-pulse">▍</span> : null}
        </div>
      </div>

      {/* Count + select-all row (always present so the layout never shifts) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="text-primary text-xs font-medium hover:underline disabled:opacity-40 disabled:no-underline"
          disabled={!complete || inventory.length === 0}
          onClick={() => setAllInventory(!allInventorySelected)}
        >
          {allInventorySelected ? "Deselect all" : "Select all"}
        </button>
        <span className="text-muted-foreground text-xs tabular-nums">
          {complete
            ? `${selected.size} of ${total} selected`
            : `Sorting suppliers… ${revealed} of ${revealTarget}`}
        </span>
      </div>

      {/* Inventory grid — stable slots, populated or skeleton */}
      <div className="max-h-[26rem] overflow-y-auto rounded-md border p-2">
        {total === 0 ? (
          <p className="text-muted-foreground p-3 text-sm">
            No suppliers were synced from Xero.
          </p>
        ) : revealTarget === 0 ? (
          <p className="text-muted-foreground p-3 text-sm">
            None of your suppliers look like ingredient suppliers — check the
            auto-excluded list below.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {inventory.map((s, i) =>
              i < revealed ? (
                <SupplierTile
                  key={s.id}
                  supplier={s}
                  checked={selected.has(s.id)}
                  disabled={!complete}
                  onToggle={() => toggle(s.id)}
                  animate={i === revealed - 1}
                />
              ) : (
                <SkeletonTile key={s.id} />
              ),
            )}
          </div>
        )}
      </div>

      {/* One quiet summary instead of a warning on every email-less tile. */}
      {complete && missingEmailCount > 0 ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <AlertTriangle className="text-amber-500 size-3.5 shrink-0" />
          {missingEmailCount} of your selected supplier
          {missingEmailCount === 1 ? " has" : "s have"} no email on file — you can
          add one later for auto-ordering.
        </p>
      ) : null}

      {/* Auto-excluded overheads — collapsed by default, re-tickable */}
      {complete && excluded.length > 0 ? (
        <div className="rounded-md border">
          <button
            type="button"
            className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left"
            onClick={() => setExcludedOpen((v) => !v)}
          >
            <span className="text-sm font-medium">
              {excluded.length} auto-excluded{" "}
              <span className="text-muted-foreground font-normal">
                (billed to overheads)
              </span>
            </span>
            <ChevronDown
              className={cn(
                "text-muted-foreground size-4 transition-transform",
                excludedOpen && "rotate-180",
              )}
            />
          </button>
          {excludedOpen ? (
            <div className="grid grid-cols-2 gap-2 border-t p-2 sm:grid-cols-3">
              {excluded.map((s) => (
                <SupplierTile
                  key={s.id}
                  supplier={s}
                  checked={selected.has(s.id)}
                  disabled={false}
                  onToggle={() => toggle(s.id)}
                  animate={false}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={!complete || isSubmitting}
        onClick={() => void onSubmit([...selected])}
      >
        {!complete
          ? "Sorting suppliers…"
          : isSubmitting
            ? "Starting…"
            : selected.size > 0
              ? `Parse ${selected.size} supplier${selected.size === 1 ? "" : "s"}`
              : "Skip parsing"}
      </Button>
    </div>
  );
}
