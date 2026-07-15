"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Plus,
  Send,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Separator } from "@workspace/ui/components/separator";
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import {
  positionBadgeClass,
  positionShortLabel,
} from "@/lib/roster/position-styles";
import { SuperbotSuggestionDestinationBanner } from "@/entities/ai-agent-chat/components/superbot-suggestion-destination-banner";
import type { VenueStaffMember } from "@/server/workforce/people.service";
import { getInitials } from "@/lib/person/get-initials";

type RosterPageClientProps = {
  organisation: string;
  venue: string;
};

type RosterApiShift = {
  id: string;
  staffId: string | null;
  dayIndex: number;
  shiftDate: string;
  start: string;
  end: string;
  positionId: string;
  positionSlug: string;
  positionDisplayName: string;
  breakMins: number;
  lifecycle: "draft" | "published" | "modified";
  computedCostCents: number | null;
  baseCostCents: number | null;
  penaltyCostCents: number | null;
  complianceFlags: Array<{
    rule: string;
    tier: "hard_block" | "warn";
    message: string;
    overridden: boolean;
  }>;
};

type RosterApiWeek = {
  state: string;
  targetLabourPct: number;
  forecastSalesCents: number;
  labourBudgetCents: number;
  totalCostCents: number;
  totalBaseCostCents: number;
  totalPenaltyCostCents: number;
  splhPlanned: number | null;
  forecastReady: boolean;
  dailyForecast: Array<{
    date: string;
    revenueCents: number;
    labourBudgetCents: number;
  }>;
};

type RosterApiPosition = {
  id: string;
  slug: string;
  displayName: string;
  sortOrder: number;
};

type RosterApiAvailabilityHint = {
  staffId: string;
  dayIndex: number;
  available: boolean;
};

type RosterApiPayload = {
  weekStart: string;
  weekEnd: string;
  week: RosterApiWeek;
  positions: RosterApiPosition[];
  staff: VenueStaffMember[];
  shifts: RosterApiShift[];
  availability: RosterApiAvailabilityHint[];
};

function shiftHours(shift: { start: string; end: string; breakMins: number }): number {
  const [sh = 0, sm = 0] = shift.start.split(":").map(Number);
  const [eh = 0, em = 0] = shift.end.split(":").map(Number);
  let totalMins = eh * 60 + em - (sh * 60 + sm);
  if (totalMins <= 0) totalMins += 24 * 60;
  return (totalMins - shift.breakMins) / 60;
}

/** Minutes from midnight for HH:mm or HH:mm:ss (venue-local wall time). */
function clockToMinutes(clock: string): number {
  const parts = clock.split(":").map((x) => x.trim());
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return h * 60 + m;
}

/** Day timeline: visible window in venue-local hours (inclusive start, exclusive end for range math uses minutes). */
const DAY_VIEW_WINDOW_START_HOUR = 6;
const DAY_VIEW_WINDOW_END_HOUR = 22;
const DAY_VIEW_TICK_STEP_HOURS = 2;

const DAY_VIEW_WINDOW_START_MIN = DAY_VIEW_WINDOW_START_HOUR * 60;
const DAY_VIEW_WINDOW_END_MIN = DAY_VIEW_WINDOW_END_HOUR * 60;

function shiftBarLayout(
  shift: { start: string; end: string },
  windowStartMin: number,
  windowEndMin: number
): { leftPct: number; widthPct: number } | null {
  let startMin = clockToMinutes(shift.start);
  let endMin = clockToMinutes(shift.end);
  if (endMin <= startMin) endMin += 24 * 60;
  const range = windowEndMin - windowStartMin;
  if (range <= 0) return null;
  const clipStart = Math.max(startMin, windowStartMin);
  const clipEnd = Math.min(endMin, windowEndMin);
  if (clipEnd <= clipStart) return null;
  return {
    leftPct: ((clipStart - windowStartMin) / range) * 100,
    widthPct: ((clipEnd - clipStart) / range) * 100,
  };
}

const dayTimelineTickHours: number[] = [];
for (let h = DAY_VIEW_WINDOW_START_HOUR; h <= DAY_VIEW_WINDOW_END_HOUR; h += DAY_VIEW_TICK_STEP_HOURS) {
  dayTimelineTickHours.push(h);
}

function formatHourTick(hour24: number): string {
  if (hour24 === 0) return "12am";
  if (hour24 < 12) return `${hour24}am`;
  if (hour24 === 12) return "12pm";
  return `${hour24 - 12}pm`;
}

function getWeekDates(baseDate: Date): Date[] {
  const monday = new Date(baseDate);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayIndexForDateInWeek(weekDates: Date[], target: Date): number {
  const iso = toIsoDate(target);
  const i = weekDates.findIndex((d) => toIsoDate(d) === iso);
  return i >= 0 ? i : 0;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function activeComplianceFlags(shift: RosterApiShift) {
  return shift.complianceFlags.filter(
    (f) => f.tier === "hard_block" || (f.tier === "warn" && !f.overridden),
  );
}

function RosterShiftChip({
  shift,
  onClick,
}: {
  shift: RosterApiShift;
  onClick: () => void;
}) {
  const flags = activeComplianceFlags(shift);
  const hasHard = flags.some((f) => f.tier === "hard_block");
  const hasWarn = flags.some((f) => f.tier === "warn");

  return (
    <button
      type="button"
      className={cn(
        "relative flex w-[min(100%,7.5rem)] flex-col rounded-md px-2 py-1 text-left transition-shadow hover:shadow-md",
        positionBadgeClass(shift.positionSlug),
        shift.lifecycle === "published" && "border border-current/20",
        shift.lifecycle === "draft" && "border-2 border-dotted border-current",
        hasHard && "ring-2 ring-destructive/60",
        !hasHard && hasWarn && "ring-2 ring-amber-500/50",
      )}
      onClick={onClick}
    >
      {flags.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background shadow-sm">
              <AlertTriangle
                className={cn("h-3 w-3", hasHard ? "text-destructive" : "text-amber-600")}
                aria-hidden
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            <ul className="list-inside list-disc space-y-0.5">
              {flags.map((f, i) => (
                <li key={`${f.rule}-${i}`}>{f.message}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      ) : null}
      <span className="text-[11px] font-semibold">
        {shift.start}–{shift.end}
      </span>
      <span className="text-[10px] opacity-70">
        {shiftHours(shift).toFixed(1)}h
        {shift.lifecycle === "draft" ? " · draft" : ""}
        {!shift.staffId ? " · open" : ""}
      </span>
    </button>
  );
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type AddShiftTarget = {
  staffId: string;
  staffName: string;
  dayIndex: number;
  shiftDateIso: string;
};

export function RosterPage({ organisation, venue }: RosterPageClientProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [payload, setPayload] = useState<RosterApiPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [addShiftTarget, setAddShiftTarget] = useState<AddShiftTarget | null>(null);
  /** May differ from `addShiftTarget.staffId` after user picks another person. */
  const [addShiftStaffId, setAddShiftStaffId] = useState("");
  const [addPositionId, setAddPositionId] = useState("");
  const [addStart, setAddStart] = useState("09:00");
  const [addEnd, setAddEnd] = useState("17:00");
  const [addBreakMins, setAddBreakMins] = useState(30);
  const [addOverrideReason, setAddOverrideReason] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const [editShift, setEditShift] = useState<RosterApiShift | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editStaffId, setEditStaffId] = useState("");
  const [editShiftDateIso, setEditShiftDateIso] = useState("");
  const [editPositionId, setEditPositionId] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editBreakMins, setEditBreakMins] = useState(0);
  const [editOverrideReason, setEditOverrideReason] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editDeleting, setEditDeleting] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [rosterView, setRosterView] = useState<"week" | "day">("week");
  const [selectedDayIndex, setSelectedDayIndex] = useState(() =>
    dayIndexForDateInWeek(getWeekDates(new Date()), new Date())
  );

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const weekStartIso = useMemo(() => {
    const first = weekDates[0];
    return first ? toIsoDate(first) : toIsoDate(new Date());
  }, [weekDates]);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        weekStart: weekStartIso,
        lifecycle: "all",
      });
      const path = `/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/roster?${params}`;
      const res = await fetch(path);
      const json = (await res.json()) as {
        data: RosterApiPayload | null;
        error: { message: string; status?: number } | null;
      };
      if (!res.ok || json.error || !json.data) {
        setLoadError(json.error?.message ?? "Could not load roster");
        setPayload(null);
        return;
      }
      setPayload(json.data);
    } catch {
      setLoadError("Could not load roster");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [organisation, venue, weekStartIso]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  function applyDefaultPositionForMember(member: VenueStaffMember) {
    const positions = payload?.positions ?? [];
    const match = member.positionSlug
      ? positions.find((p) => p.slug === member.positionSlug)
      : undefined;
    setAddPositionId(match?.id ?? positions[0]?.id ?? "");
  }

  function closeEditShift() {
    setEditShift(null);
    setEditMemberName("");
    setEditStaffId("");
    setEditShiftDateIso("");
    setEditPositionId("");
    setEditStart("");
    setEditEnd("");
    setEditBreakMins(0);
    setEditOverrideReason("");
  }

  function openAddShift(target: AddShiftTarget, member: VenueStaffMember) {
    closeEditShift();
    setAddStart("09:00");
    setAddEnd("17:00");
    setAddBreakMins(30);
    setAddShiftStaffId(target.staffId);
    setAddShiftTarget(target);
    applyDefaultPositionForMember(member);
  }

  function closeAddShift() {
    setAddShiftTarget(null);
    setAddShiftStaffId("");
    setAddOverrideReason("");
  }

  function openEditShift(shift: RosterApiShift, member?: VenueStaffMember) {
    closeAddShift();
    setEditShift(shift);
    setEditMemberName(member?.name ?? (shift.staffId ? "Assigned" : "Open shift"));
    setEditStaffId(shift.staffId ?? "");
    setEditShiftDateIso(shift.shiftDate);
    setEditPositionId(shift.positionId);
    setEditStart(shift.start.length >= 5 ? shift.start.slice(0, 5) : shift.start);
    setEditEnd(shift.end.length >= 5 ? shift.end.slice(0, 5) : shift.end);
    setEditBreakMins(shift.breakMins);
  }

  function onEditStaffChange(staffId: string) {
    setEditStaffId(staffId);
    const member = (payload?.staff ?? []).find((s) => s.id === staffId);
    if (member) {
      const positions = payload?.positions ?? [];
      const match = member.positionSlug
        ? positions.find((p) => p.slug === member.positionSlug)
        : undefined;
      setEditPositionId(match?.id ?? positions[0]?.id ?? "");
    }
  }

  async function submitEditShift() {
    if (!editShift || !editStaffId || !editPositionId) {
      toast.error("Choose a person and position");
      return;
    }
    setEditSaving(true);
    try {
      const path = `/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/roster`;
      const res = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: editShift.id,
          userProfileId: editStaffId,
          shiftDate: editShiftDateIso,
          start: editStart,
          end: editEnd,
          positionId: editPositionId,
          breakMinutes: editBreakMins,
          weekStart: weekStartIso,
          overrideReason: editOverrideReason.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        data: { id: string } | null;
        error: { message: string; status?: number } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Could not update shift");
        return;
      }
      toast.success("Shift updated");
      closeEditShift();
      await loadRoster();
    } catch {
      toast.error("Could not update shift");
    } finally {
      setEditSaving(false);
    }
  }

  async function submitDeleteShift() {
    if (!editShift) return;
    setEditDeleting(true);
    try {
      const path = `/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/roster/shifts/${encodeURIComponent(editShift.id)}?weekStart=${encodeURIComponent(weekStartIso)}`;
      const res = await fetch(path, { method: "DELETE" });
      const json = (await res.json()) as {
        data: unknown;
        error: { message: string } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Could not delete shift");
        return;
      }
      toast.success("Shift deleted");
      closeEditShift();
      await loadRoster();
    } catch {
      toast.error("Could not delete shift");
    } finally {
      setEditDeleting(false);
    }
  }

  function onAddShiftStaffChange(staffId: string) {
    setAddShiftStaffId(staffId);
    const member = (payload?.staff ?? []).find((s) => s.id === staffId);
    if (member) applyDefaultPositionForMember(member);
  }

  async function submitAddShift() {
    if (!addShiftTarget || !addShiftStaffId || !addPositionId) {
      toast.error("Choose a person and position");
      return;
    }
    setAddSaving(true);
    try {
      const path = `/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/roster`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userProfileId: addShiftStaffId,
          shiftDate: addShiftTarget.shiftDateIso,
          start: addStart,
          end: addEnd,
          positionId: addPositionId,
          breakMinutes: addBreakMins,
          weekStart: weekStartIso,
          overrideReason: addOverrideReason.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        data: { id: string } | null;
        error: { message: string; status?: number } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Could not save shift");
        return;
      }
      toast.success("Shift saved as draft");
      closeAddShift();
      await loadRoster();
    } catch {
      toast.error("Could not save shift");
    } finally {
      setAddSaving(false);
    }
  }

  const staffSorted = useMemo(() => {
    const staff = payload?.staff ?? [];
    const orderBySlug = new Map(
      (payload?.positions ?? []).map((p) => [p.slug, p.sortOrder])
    );
    return [...staff].sort((a, b) => {
      const pa = a.positionSlug != null ? (orderBySlug.get(a.positionSlug) ?? 999) : 999;
      const pb = b.positionSlug != null ? (orderBySlug.get(b.positionSlug) ?? 999) : 999;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
  }, [payload]);

  const shifts = payload?.shifts ?? [];

  const staffShiftMap = useMemo(() => {
    const map = new Map<string, Map<number, RosterApiShift>>();
    for (const shift of shifts) {
      if (shift.dayIndex < 0 || shift.dayIndex > 6) continue;
      const key = shift.staffId ?? "__open__";
      if (!map.has(key)) map.set(key, new Map());
      const inner = map.get(key)!;
      if (!inner.has(shift.dayIndex)) inner.set(shift.dayIndex, shift);
    }
    return map;
  }, [shifts]);

  /** Merged availability when API provides a row (`true` = available, `false` = not). */
  const staffAvailabilityByDay = useMemo(() => {
    const map = new Map<string, Map<number, boolean>>();
    for (const row of payload?.availability ?? []) {
      if (row.dayIndex < 0 || row.dayIndex > 6) continue;
      if (!map.has(row.staffId)) map.set(row.staffId, new Map());
      map.get(row.staffId)!.set(row.dayIndex, row.available);
    }
    return map;
  }, [payload?.availability]);

  const staffWeeklyHours = useMemo(() => {
    const map = new Map<string, number>();
    for (const shift of shifts) {
      if (!shift.staffId) continue;
      if (shift.dayIndex < 0 || shift.dayIndex > 6) continue;
      const prev = map.get(shift.staffId) ?? 0;
      map.set(shift.staffId, prev + shiftHours(shift));
    }
    return map;
  }, [shifts]);

  const addShiftSelectedName = useMemo(() => {
    if (!addShiftStaffId) return "";
    return (payload?.staff ?? []).find((s) => s.id === addShiftStaffId)?.name ?? "";
  }, [addShiftStaffId, payload?.staff]);

  const editShiftSelectedName = useMemo(() => {
    if (!editStaffId) return "";
    return (payload?.staff ?? []).find((s) => s.id === editStaffId)?.name ?? "";
  }, [editStaffId, payload?.staff]);

  const weekLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
    const start = weekDates[0];
    const end = weekDates[6];
    if (!start || !end) return "";
    return `${fmt.format(start)} — ${fmt.format(end)}`;
  }, [weekDates]);

  const safeDayIdx = Math.min(6, Math.max(0, selectedDayIndex));
  const selectedDate = weekDates[safeDayIdx];
  const selectedDayIso = selectedDate ? toIsoDate(selectedDate) : "";

  const dateNavLabel = useMemo(() => {
    if (rosterView === "week") return weekLabel;
    const d = weekDates[safeDayIdx];
    if (!d) return "";
    const nowY = new Date().getFullYear();
    return new Intl.DateTimeFormat("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(d.getFullYear() !== nowY ? { year: "numeric" as const } : {}),
    }).format(d);
  }, [rosterView, weekLabel, weekDates, safeDayIdx]);

  function goDateNavPrev() {
    if (rosterView === "week") {
      setWeekOffset((w) => w - 1);
      return;
    }
    if (safeDayIdx > 0) {
      setSelectedDayIndex(safeDayIdx - 1);
    } else {
      setWeekOffset((w) => w - 1);
      setSelectedDayIndex(6);
    }
  }

  function goDateNavNext() {
    if (rosterView === "week") {
      setWeekOffset((w) => w + 1);
      return;
    }
    if (safeDayIdx < 6) {
      setSelectedDayIndex(safeDayIdx + 1);
    } else {
      setWeekOffset((w) => w + 1);
      setSelectedDayIndex(0);
    }
  }

  function goDateNavToday() {
    setWeekOffset(0);
    setSelectedDayIndex(dayIndexForDateInWeek(getWeekDates(new Date()), new Date()));
  }

  const costSummary = useMemo(() => {
    const week = payload?.week;
    let totalHours = 0;
    let totalCostCents = week?.totalCostCents ?? 0;
    const dailyCosts = Array.from({ length: 7 }, () => 0);

    for (const shift of shifts) {
      const di = shift.dayIndex;
      if (di < 0 || di > 6) continue;
      const hours = shiftHours(shift);
      const cost = shift.computedCostCents ?? 0;
      totalHours += hours;
      dailyCosts[di] = (dailyCosts[di] ?? 0) + cost;
    }

    if (!week?.totalCostCents) {
      totalCostCents = shifts.reduce((a, s) => a + (s.computedCostCents ?? 0), 0);
    }

    const budgetCents = week?.labourBudgetCents ?? 0;

    return { totalHours, totalCostCents, dailyCosts, budgetCents, week };
  }, [shifts, payload?.week]);

  const headerMetrics = useMemo(() => {
    const subset =
      rosterView === "day"
        ? shifts.filter((s) => s.dayIndex === safeDayIdx)
        : shifts.filter((s) => s.dayIndex >= 0 && s.dayIndex <= 6);
    let totalHours = 0;
    let totalCostCents = 0;
    const ids = new Set<string>();
    for (const shift of subset) {
      totalHours += shiftHours(shift);
      totalCostCents += shift.computedCostCents ?? 0;
      if (shift.staffId) ids.add(shift.staffId);
    }
    return {
      totalHours,
      totalCostCents,
      staffRosteredCount: ids.size,
      budgetCents: costSummary.budgetCents,
    };
  }, [shifts, rosterView, safeDayIdx, costSummary.budgetCents]);

  const staffDayHours = useMemo(() => {
    const map = new Map<string, number>();
    for (const shift of shifts) {
      if (shift.dayIndex !== safeDayIdx || !shift.staffId) continue;
      const prev = map.get(shift.staffId) ?? 0;
      map.set(shift.staffId, prev + shiftHours(shift));
    }
    return map;
  }, [shifts, safeDayIdx]);

  const openShiftMap = useMemo(
    () => staffShiftMap.get("__open__") ?? new Map<number, RosterApiShift>(),
    [staffShiftMap],
  );

  const hasOpenShifts = openShiftMap.size > 0;

  const complianceSummary = useMemo(() => {
    let hard = 0;
    let warn = 0;
    for (const shift of shifts) {
      for (const flag of activeComplianceFlags(shift)) {
        if (flag.tier === "hard_block") hard += 1;
        else warn += 1;
      }
    }
    return { hard, warn };
  }, [shifts]);

  function showComplianceSummary() {
    const { hard, warn } = complianceSummary;
    if (hard === 0 && warn === 0) {
      toast.success("No compliance issues on this roster");
      return;
    }
    const parts: string[] = [];
    if (hard > 0) parts.push(`${hard} hard block${hard === 1 ? "" : "s"}`);
    if (warn > 0) parts.push(`${warn} warning${warn === 1 ? "" : "s"}`);
    toast.warning(parts.join(", "), {
      description: "Open a flagged shift for details or add an override reason when saving.",
    });
  }

  async function postRosterAction(
    suffix: string,
    body: Record<string, unknown>,
    successMessage: string,
    actionKey: string,
  ) {
    setActionLoading(actionKey);
    try {
      const path = `/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/roster/${suffix}`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        data: unknown;
        error: { message: string } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Action failed");
        return;
      }
      toast.success(successMessage);
      await loadRoster();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePublish() {
    await postRosterAction(
      "publish",
      { weekStart: weekStartIso },
      "Roster published",
      "publish",
    );
  }

  async function handleCopyWeek() {
    await postRosterAction(
      "copy-week",
      { weekStart: weekStartIso },
      "Previous week copied as drafts",
      "copy-week",
    );
  }

  async function handleAutoBuild() {
    await postRosterAction(
      "auto-build",
      { weekStart: weekStartIso },
      "Draft roster generated",
      "auto-build",
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <SuperbotSuggestionDestinationBanner
        pathSuffix="workforce/roster"
        className="shrink-0"
      />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Roster</h1>
            {loading ? <span className="text-sm text-muted-foreground">Loading…</span> : null}
            {loadError ? <span className="text-sm text-destructive">{loadError}</span> : null}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={goDateNavPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-[160px] max-w-[240px] shrink truncate px-2 text-xs font-medium sm:min-w-[180px]"
              onClick={goDateNavToday}
            >
              <span className="truncate">{dateNavLabel}</span>
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={goDateNavNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <span className="font-semibold tabular-nums text-foreground">
              {headerMetrics.totalHours.toFixed(1)}h
            </span>
            <span
              className="h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/70"
              aria-hidden
            />
            <span>
              <span className="tabular-nums font-semibold text-foreground">
                {headerMetrics.staffRosteredCount}
              </span>{" "}
              rostered
            </span>
            <span
              className="h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/70"
              aria-hidden
            />
            <span className="tabular-nums">
              <span className="font-semibold text-foreground">
                {formatCurrency(headerMetrics.totalCostCents)}
              </span>
              <span className="text-muted-foreground"> / {formatCurrency(headerMetrics.budgetCents)}</span>
            </span>
            {payload?.week.splhPlanned != null ? (
              <>
                <span
                  className="h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/70"
                  aria-hidden
                />
                <span>
                  <span className="font-semibold tabular-nums text-foreground">
                    ${payload.week.splhPlanned.toFixed(0)}
                  </span>{" "}
                  SPLH
                </span>
              </>
            ) : null}
          </div>
          <span
            className="h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/70"
            aria-hidden
          />
          <Button
            size="sm"
            className="gap-1.5"
            disabled={actionLoading === "publish"}
            onClick={() => void handlePublish()}
          >
            <Send className="h-3.5 w-3.5" />
            {actionLoading === "publish" ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      <Separator className="shrink-0" />

      <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={actionLoading === "copy-week"}
            onClick={() => void handleCopyWeek()}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            Copy week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={showComplianceSummary}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
            Compliance
            {complianceSummary.hard + complianceSummary.warn > 0 ? (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                {complianceSummary.hard + complianceSummary.warn}
              </Badge>
            ) : null}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={actionLoading === "auto-build"}
            onClick={() => void handleAutoBuild()}
          >
            <Wand2 className="h-3.5 w-3.5 text-purple-500" />
            Auto-build
          </Button>
        </div>
        <div className="ml-auto flex shrink-0">
        <ToggleGroup
          type="single"
          value={rosterView}
          onValueChange={(v) => {
            if (v === "week" || v === "day") setRosterView(v);
          }}
          variant="outline"
          size="sm"
          spacing={0}
          className="shrink-0"
        >
          <ToggleGroupItem value="week" aria-label="Week view" className="h-8 text-xs">
            Week
          </ToggleGroupItem>
          <ToggleGroupItem value="day" aria-label="Day view" className="h-8 text-xs">
            Day
          </ToggleGroupItem>
        </ToggleGroup>
        </div>
      </div>

      {!loading && !loadError && payload && !payload.week.forecastReady ? (
        <Alert className="shrink-0">
          <Info className="h-4 w-4" />
          <AlertTitle>Demand overlay learning</AlertTitle>
          <AlertDescription>
            Forecast-driven labour budget turns on once your venue has enough sales history. You can
            still build and cost rosters now.
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && !loadError && payload && payload.positions.length === 0 ? (
        <Alert className="shrink-0 border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/20">
          <Info className="text-amber-600 dark:text-amber-500" />
          <AlertTitle>No roster stations for this venue</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Shifts need job stations (Chef, FOH, etc.). This venue has none in the database yet—usually
            because it was created after the initial seed. Apply the migration{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">20260412100000_backfill_positions_missing_venues.sql</code>{" "}
            or insert rows into <code className="rounded bg-muted px-1 py-0.5 text-xs">positions</code> for
            this venue, then refresh.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0 py-0 shadow-sm">
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 !py-0">
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
            <div className={cn(rosterView === "week" ? "min-w-[900px]" : "min-w-[1000px]")}>
              {rosterView === "week" ? (
                <>
                  <div className="sticky top-0 z-10 grid grid-cols-[200px_repeat(7,1fr)] border-b bg-muted/80 backdrop-blur">
                    <div className="flex items-center border-r px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Staff
                      </span>
                    </div>
                    {weekDates.map((date, i) => {
                      const isToday = date.toDateString() === new Date().toDateString();
                      const dayCost = costSummary.dailyCosts[i] ?? 0;
                      const dayBudget = payload?.week.dailyForecast[i]?.labourBudgetCents;
                      const showBudget = payload?.week.forecastReady && dayBudget != null;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center justify-between gap-1 border-r px-2.5 py-2 last:border-r-0",
                            isToday && "bg-blue-50/80 dark:bg-blue-950/30"
                          )}
                        >
                          <span
                            className={cn(
                              "shrink-0 text-base font-semibold tabular-nums leading-none",
                              isToday ? "text-blue-600" : "text-foreground"
                            )}
                          >
                            {date.getDate()}
                          </span>
                          <div className="min-w-0 flex flex-col items-end text-right leading-tight">
                            <span
                              className={cn(
                                "text-[10px] font-medium",
                                isToday ? "text-blue-600" : "text-muted-foreground"
                              )}
                            >
                              {DAY_NAMES[i]}
                            </span>
                            <span
                              className={cn(
                                "text-[11px] font-semibold tabular-nums",
                                isToday ? "text-blue-600" : "text-foreground"
                              )}
                            >
                              {formatCurrency(dayCost)}
                            </span>
                            {showBudget ? (
                              <span className="text-[10px] tabular-nums text-muted-foreground">
                                / {formatCurrency(dayBudget)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {staffSorted.map((member) => {
                    const weekHrs = staffWeeklyHours.get(member.id) ?? 0;
                    const badgeLabel =
                      member.positionSlug && member.positionDisplayName
                        ? positionShortLabel(member.positionSlug, member.positionDisplayName)
                        : "—";
                    return (
                      <div
                        key={member.id}
                        className="grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-b-0 hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-2.5 border-r px-3 py-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {getInitials(member.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{member.name}</p>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "px-1.5 py-0 text-[10px]",
                                  member.positionSlug
                                    ? positionBadgeClass(member.positionSlug)
                                    : "border-dashed text-muted-foreground"
                                )}
                              >
                                {badgeLabel}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{weekHrs.toFixed(1)}h</span>
                            </div>
                          </div>
                        </div>

                        {Array.from({ length: 7 }, (_, dayIdx) => {
                          const shift = staffShiftMap.get(member.id)?.get(dayIdx);
                          const isToday = weekDates[dayIdx]!.toDateString() === new Date().toDateString();
                          const avail = staffAvailabilityByDay.get(member.id)?.get(dayIdx);
                          const explicitlyUnavailable = avail === false;

                          const openThisCell = () => {
                            const d = weekDates[dayIdx];
                            if (!d) return;
                            openAddShift(
                              {
                                staffId: member.id,
                                staffName: member.name,
                                dayIndex: dayIdx,
                                shiftDateIso: toIsoDate(d),
                              },
                              member
                            );
                          };

                          return (
                            <div
                              key={dayIdx}
                              className={cn(
                                "relative flex min-h-[56px] items-center justify-center border-r p-1 last:border-r-0",
                                isToday && !explicitlyUnavailable && "bg-blue-50/40 dark:bg-blue-950/20",
                                explicitlyUnavailable && "bg-muted/70 dark:bg-muted/35"
                              )}
                            >
                              {shift ? (
                                <RosterShiftChip
                                  shift={shift}
                                  onClick={() => openEditShift(shift, member)}
                                />
                              ) : explicitlyUnavailable ? (
                                <div className="relative flex h-full min-h-[48px] w-full items-center justify-center">
                                  <div className="pointer-events-none flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-md">
                                    <X
                                      className="h-4 w-4 text-muted-foreground/80"
                                      strokeWidth={2.25}
                                      aria-hidden
                                    />
                                    <span className="sr-only">Not available</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute inset-0 flex items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-background/40 hover:opacity-100"
                                    onClick={openThisCell}
                                    aria-label="Add shift"
                                  >
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="flex min-h-[48px] w-full flex-1 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-muted/60 hover:opacity-100"
                                  onClick={openThisCell}
                                  aria-label="Add shift"
                                >
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {hasOpenShifts ? (
                    <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-muted/10 last:border-b-0">
                      <div className="flex items-center border-r px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">Open shifts</p>
                          <p className="text-[10px] text-muted-foreground">Unassigned</p>
                        </div>
                      </div>
                      {Array.from({ length: 7 }, (_, dayIdx) => {
                        const shift = openShiftMap.get(dayIdx);
                        return (
                          <div
                            key={dayIdx}
                            className="relative flex min-h-[56px] items-center justify-center border-r p-1 last:border-r-0"
                          >
                            {shift ? (
                              <RosterShiftChip shift={shift} onClick={() => openEditShift(shift)} />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="sticky top-0 z-10 grid grid-cols-[200px_1fr] border-b bg-muted/80 backdrop-blur">
                    <div className="flex items-center border-r px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Staff
                      </span>
                    </div>
                    <div className="flex min-w-0 border-r">
                      {dayTimelineTickHours.map((h, idx) => (
                        <div
                          key={h}
                          className={cn(
                            "flex min-h-[40px] flex-1 items-center justify-center border-l border-border/50 py-2 text-[10px] font-medium text-muted-foreground",
                            idx === 0 && "border-l-0"
                          )}
                        >
                          {formatHourTick(h)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {staffSorted.map((member) => {
                    const dayHrs = staffDayHours.get(member.id) ?? 0;
                    const badgeLabel =
                      member.positionSlug && member.positionDisplayName
                        ? positionShortLabel(member.positionSlug, member.positionDisplayName)
                        : "—";
                    const shift = staffShiftMap.get(member.id)?.get(safeDayIdx);
                    const isToday =
                      selectedDate?.toDateString() === new Date().toDateString();
                    const avail = staffAvailabilityByDay.get(member.id)?.get(safeDayIdx);
                    const explicitlyUnavailable = avail === false;
                    const barLayout =
                      shift &&
                      shiftBarLayout(shift, DAY_VIEW_WINDOW_START_MIN, DAY_VIEW_WINDOW_END_MIN);

                    const openDayRow = () => {
                      if (!selectedDate) return;
                      openAddShift(
                        {
                          staffId: member.id,
                          staffName: member.name,
                          dayIndex: safeDayIdx,
                          shiftDateIso: selectedDayIso,
                        },
                        member
                      );
                    };

                    return (
                      <div
                        key={member.id}
                        className="grid grid-cols-[200px_1fr] border-b last:border-b-0 hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-2.5 border-r px-3 py-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {getInitials(member.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{member.name}</p>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "px-1.5 py-0 text-[10px]",
                                  member.positionSlug
                                    ? positionBadgeClass(member.positionSlug)
                                    : "border-dashed text-muted-foreground"
                                )}
                              >
                                {badgeLabel}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{dayHrs.toFixed(1)}h</span>
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "border-r p-1",
                            isToday && !explicitlyUnavailable && "bg-blue-50/40 dark:bg-blue-950/20",
                            explicitlyUnavailable && "bg-muted/70 dark:bg-muted/35"
                          )}
                        >
                          <div className="relative min-h-[48px] w-full">
                            <div className="pointer-events-none absolute inset-0 flex">
                              {dayTimelineTickHours.map((h, idx) => (
                                <div
                                  key={h}
                                  className={cn(
                                    "min-h-full flex-1",
                                    idx > 0 && "border-l border-border/35"
                                  )}
                                />
                              ))}
                            </div>
                            {shift && barLayout ? (
                              <button
                                type="button"
                                className={cn(
                                  "absolute inset-y-0 z-[1] flex min-w-[2.25rem] flex-col justify-center rounded-md px-1.5 py-0.5 text-left shadow-sm transition-shadow hover:shadow-md",
                                  positionBadgeClass(shift.positionSlug),
                                  shift.lifecycle === "published" && "border border-current/20",
                                  shift.lifecycle === "draft" && "border-2 border-dotted border-current",
                                  activeComplianceFlags(shift).some((f) => f.tier === "hard_block") &&
                                    "ring-2 ring-destructive/60",
                                  activeComplianceFlags(shift).some((f) => f.tier === "warn") &&
                                    !activeComplianceFlags(shift).some((f) => f.tier === "hard_block") &&
                                    "ring-2 ring-amber-500/50",
                                )}
                                style={{
                                  left: `${barLayout.leftPct}%`,
                                  width: `${barLayout.widthPct}%`,
                                }}
                                onClick={() => openEditShift(shift, member)}
                              >
                                <span className="truncate text-[10px] font-semibold leading-tight">
                                  {shift.start}–{shift.end}
                                </span>
                                <span className="truncate text-[9px] opacity-80">
                                  {shiftHours(shift).toFixed(1)}h
                                  {shift.lifecycle === "draft" ? " · draft" : ""}
                                </span>
                              </button>
                            ) : shift && !barLayout ? (
                              <div className="relative z-[1] flex min-h-[48px] items-center px-2">
                                <span className="text-[10px] text-muted-foreground">
                                  Outside {formatHourTick(DAY_VIEW_WINDOW_START_HOUR)}–
                                  {formatHourTick(DAY_VIEW_WINDOW_END_HOUR)} window
                                </span>
                              </div>
                            ) : explicitlyUnavailable ? (
                              <div className="relative z-[1] flex min-h-[48px] w-full items-center justify-center">
                                <div className="pointer-events-none flex flex-col items-center gap-0.5">
                                  <X
                                    className="h-4 w-4 text-muted-foreground/80"
                                    strokeWidth={2.25}
                                    aria-hidden
                                  />
                                  <span className="sr-only">Not available</span>
                                </div>
                                <button
                                  type="button"
                                  className="absolute inset-0 flex items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-background/40 hover:opacity-100"
                                  onClick={openDayRow}
                                  aria-label="Add shift"
                                >
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="relative z-[1] flex min-h-[48px] w-full items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-muted/60 hover:opacity-100"
                                onClick={openDayRow}
                                aria-label="Add shift"
                              >
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {staffSorted.length === 0 && !loading ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No staff assigned to this venue yet.
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={addShiftTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeAddShift();
        }}
      >
        <SheetContent
          side="top"
          className={cn(
            "!inset-x-auto !left-1/2 !right-auto top-0 !translate-x-[-50%]",
            "w-[min(100%-1.5rem,28rem)] sm:w-full sm:max-w-md",
            "max-h-[min(90vh,560px)] overflow-y-auto rounded-b-xl border-x border-b shadow-xl"
          )}
        >
          <SheetHeader className="text-center sm:text-left">
            <SheetTitle>Add shift</SheetTitle>
            <SheetDescription>
              {addShiftTarget ? (
                <>
                  {DAY_NAMES[addShiftTarget.dayIndex]} {addShiftTarget.shiftDateIso} · times are{" "}
                  <span className="font-medium text-foreground">venue-local</span>
                </>
              ) : null}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4">
            <div className="grid gap-2">
              <Label htmlFor="roster-add-staff">Person</Label>
              <Select value={addShiftStaffId} onValueChange={onAddShiftStaffChange}>
                <SelectTrigger id="roster-add-staff" className="w-full">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffSorted.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addShiftTarget && addShiftStaffId && addShiftStaffId !== addShiftTarget.staffId ? (
                <p className="text-xs text-muted-foreground">
                  Shift will be saved for <span className="font-medium text-foreground">{addShiftSelectedName}</span>{" "}
                  (not the row you clicked).
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roster-add-position">Position</Label>
              <Select value={addPositionId} onValueChange={setAddPositionId}>
                <SelectTrigger id="roster-add-position" className="w-full max-w-md">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {(payload?.positions ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="grid gap-2">
                <Label htmlFor="roster-add-start">Start</Label>
                <Input
                  id="roster-add-start"
                  type="time"
                  value={addStart}
                  onChange={(e) => setAddStart(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="roster-add-end">End</Label>
                <Input
                  id="roster-add-end"
                  type="time"
                  value={addEnd}
                  onChange={(e) => setAddEnd(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="roster-add-break">Break (minutes)</Label>
                <Input
                  id="roster-add-break"
                  type="number"
                  min={0}
                  max={480}
                  value={addBreakMins}
                  onChange={(e) => setAddBreakMins(Number(e.target.value) || 0)}
                  className="w-[120px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="roster-add-override">Compliance override reason</Label>
                <Input
                  id="roster-add-override"
                  placeholder="Required if compliance warns"
                  value={addOverrideReason}
                  onChange={(e) => setAddOverrideReason(e.target.value)}
                />
              </div>
            </div>
          </div>
          <SheetFooter className="flex-row justify-end gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={closeAddShift} disabled={addSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitAddShift()}
              disabled={
                addSaving ||
                !(payload?.positions ?? []).length ||
                !addPositionId ||
                !addShiftStaffId
              }
            >
              {addSaving ? "Saving…" : "Save draft"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={editShift !== null}
        onOpenChange={(open) => {
          if (!open) closeEditShift();
        }}
      >
        <SheetContent
          side="bottom"
          className={cn(
            "!inset-x-auto !left-1/2 !right-auto bottom-0 !translate-x-[-50%]",
            "w-[min(100%-1.5rem,28rem)] sm:w-full sm:max-w-md",
            "max-h-[min(85vh,560px)] overflow-y-auto rounded-t-xl border-x border-t shadow-xl"
          )}
        >
          <SheetHeader className="text-center sm:text-left">
            <SheetTitle>Edit shift</SheetTitle>
            <SheetDescription>
              {editShift ? (
                <>
                  {editMemberName ? (
                    <>
                      Row: <span className="font-medium text-foreground">{editMemberName}</span>
                      {" · "}
                    </>
                  ) : null}
                  Times are <span className="font-medium text-foreground">venue-local</span>
                </>
              ) : null}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4">
            <div className="grid gap-2">
              <Label htmlFor="roster-edit-date">Date</Label>
              <Input
                id="roster-edit-date"
                type="date"
                value={editShiftDateIso}
                onChange={(e) => setEditShiftDateIso(e.target.value)}
                className="w-full max-w-[200px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roster-edit-staff">Person</Label>
              <Select value={editStaffId} onValueChange={onEditStaffChange}>
                <SelectTrigger id="roster-edit-staff" className="w-full">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffSorted.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editShift && editStaffId && editStaffId !== editShift.staffId ? (
                <p className="text-xs text-muted-foreground">
                  Shift will be saved for{" "}
                  <span className="font-medium text-foreground">{editShiftSelectedName}</span>
                  {editMemberName && editMemberName !== editShiftSelectedName
                    ? ` (row was ${editMemberName})`
                    : ""}
                  .
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roster-edit-position">Position</Label>
              <Select value={editPositionId} onValueChange={setEditPositionId}>
                <SelectTrigger id="roster-edit-position" className="w-full max-w-md">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {(payload?.positions ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="grid gap-2">
                <Label htmlFor="roster-edit-start">Start</Label>
                <Input
                  id="roster-edit-start"
                  type="time"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="roster-edit-end">End</Label>
                <Input
                  id="roster-edit-end"
                  type="time"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="roster-edit-break">Break (minutes)</Label>
                <Input
                  id="roster-edit-break"
                  type="number"
                  min={0}
                  max={480}
                  value={editBreakMins}
                  onChange={(e) => setEditBreakMins(Number(e.target.value) || 0)}
                  className="w-[120px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="roster-edit-override">Compliance override reason</Label>
                <Input
                  id="roster-edit-override"
                  placeholder="Required if compliance warns"
                  value={editOverrideReason}
                  onChange={(e) => setEditOverrideReason(e.target.value)}
                />
              </div>
            </div>
          </div>
          <SheetFooter className="flex-row justify-between gap-2 sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              className="gap-1.5"
              disabled={editSaving || editDeleting || !editShift}
              onClick={() => void submitDeleteShift()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {editDeleting ? "Deleting…" : "Delete"}
            </Button>
            <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={closeEditShift} disabled={editSaving || editDeleting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitEditShift()}
              disabled={
                editSaving ||
                editDeleting ||
                !(payload?.positions ?? []).length ||
                !editPositionId ||
                !editStaffId ||
                !editShift
              }
            >
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}
