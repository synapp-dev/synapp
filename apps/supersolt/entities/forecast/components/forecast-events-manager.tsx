"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";

type EventKind =
  | "closure"
  | "promotion"
  | "event"
  | "price_change"
  | "menu_change";

type CalendarEvent = {
  id: string;
  kind: EventKind;
  startDate: string;
  endDate: string;
  title: string;
  note: string | null;
  expectedMultiplier: number | null;
};

const KINDS: Array<{ value: EventKind; label: string; hint: string }> = [
  { value: "closure", label: "Closure", hint: "Venue closed. Forecast is set to zero and the day is left out of baselines." },
  { value: "promotion", label: "Promotion", hint: "A promo you expect to move trade. Optional expected lift, wider band." },
  { value: "event", label: "Local event", hint: "A one-off nearby event (concert, festival). Optional expected lift, wider band." },
  { value: "price_change", label: "Price change", hint: "Prices changed from this date. Baselines relearn from here on." },
  { value: "menu_change", label: "Menu change", hint: "Menu changed from this date. Baselines relearn from here on." },
];

const KIND_BADGE: Record<EventKind, string> = {
  closure: "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300",
  promotion: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300",
  event: "border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300",
  price_change: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
  menu_change: "border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300",
};

const kindLabel = (k: EventKind) => KINDS.find((x) => x.value === k)?.label ?? k;
const hasMultiplier = (k: EventKind) => k === "promotion" || k === "event";

function effectSummary(e: CalendarEvent): string {
  switch (e.kind) {
    case "closure":
      return "Forecast set to closed";
    case "price_change":
    case "menu_change":
      return `Level shift from ${e.startDate}`;
    case "promotion":
    case "event":
      if (e.expectedMultiplier && e.expectedMultiplier !== 1) {
        const pct = Math.round((e.expectedMultiplier - 1) * 100);
        return `Expected ${pct >= 0 ? "+" : ""}${pct}%, wider band`;
      }
      return "Wider band (no expected lift set)";
    default:
      return "";
  }
}

function formatRange(start: string, end: string): string {
  return start === end ? start : `${start} → ${end}`;
}

export function ForecastEventsManager({
  organisation,
  venue,
  onChanged,
}: {
  organisation: string;
  venue: string;
  /** Fires after an event is added or removed (forecasts have been recomputed). */
  onChanged?: () => void;
}) {
  const base = `/api/organisations/${organisation}/venues/${venue}/insights/forecast/events`;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [kind, setKind] = useState<EventKind>("closure");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [liftPct, setLiftPct] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(base);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load events");
      setEvents(json.data as CalendarEvent[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setTitle("");
    setNote("");
    setLiftPct("");
  };

  async function handleAdd() {
    if (!title.trim()) return toast.error("Add a short title");
    if (!startDate) return toast.error("Pick a start date");
    const end = endDate || startDate;
    if (end < startDate) return toast.error("End date is before the start date");

    let expectedMultiplier: number | null = null;
    if (hasMultiplier(kind) && liftPct.trim()) {
      const pct = Number(liftPct);
      if (!Number.isFinite(pct) || pct <= -100 || pct > 400) {
        return toast.error("Expected lift must be a sensible percentage");
      }
      expectedMultiplier = 1 + pct / 100;
    }

    setSubmitting(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          startDate,
          endDate: end,
          title: title.trim(),
          note: note.trim() || null,
          expectedMultiplier,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not save event");
      setEvents((prev) =>
        [...prev, json.data as CalendarEvent].sort((a, b) =>
          a.startDate.localeCompare(b.startDate),
        ),
      );
      resetForm();
      toast.success("Event added. Forecasts updated.");
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save event");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`${base}/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not delete");
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success("Event removed. Forecasts updated.");
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    } finally {
      setDeletingId(null);
    }
  }

  const activeHint = useMemo(
    () => KINDS.find((k) => k.value === kind)?.hint ?? "",
    [kind],
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Venue calendar
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Record things happening at your venue that sales data can&apos;t reveal on its own:
            closures, promotions, local events, and price or menu changes. These sharpen your sales
            forecast for those days (and feed your morning digest).
          </CardDescription>
        </div>
      </CardHeader>

      {/* Add form */}
      <CardContent className="space-y-3 border-b px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as EventKind)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Start date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              End date <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
          {hasMultiplier(kind) ? (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Expected lift % <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 20"
                value={liftPct}
                onChange={(e) => setLiftPct(e.target.value)}
                className="h-9"
              />
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Title</Label>
            <Input
              placeholder="e.g. Public holiday closure, 2-for-1 launch…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">
              Note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              rows={1}
              placeholder="Anything worth remembering…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-9 resize-none"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">{activeHint}</p>
          <Button size="sm" className="gap-1.5" onClick={handleAdd} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add event
          </Button>
        </div>
      </CardContent>

      {/* List */}
      <CardContent className="px-0 py-0">
        {loading ? (
          <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : events.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-1.5 text-center">
            <CalendarDays className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">No calendar events yet</p>
            <p className="text-xs text-muted-foreground">
              Add a closure, promo, or price change above and the forecast will account for it.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40"
              >
                <Badge
                  variant="outline"
                  className={cn("shrink-0 text-[11px] font-medium", KIND_BADGE[e.kind])}
                >
                  {kindLabel(e.kind)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-muted-foreground text-xs">
                    <span className="tabular-nums">{formatRange(e.startDate, e.endDate)}</span>
                    {" · "}
                    {effectSummary(e)}
                    {e.note ? <span className="opacity-70"> · {e.note}</span> : null}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(e.id)}
                  disabled={deletingId === e.id}
                  aria-label={`Delete ${e.title}`}
                >
                  {deletingId === e.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
