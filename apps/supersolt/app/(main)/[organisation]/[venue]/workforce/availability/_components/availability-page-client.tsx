"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
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
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";
import { cn } from "@workspace/ui/lib/utils";
import {
  positionBadgeClass,
  positionShortLabel,
} from "@/lib/roster/position-styles";
import { buildScopedPath } from "@/lib/build-scoped-path";
import type { VenueStaffMember } from "@/server/workforce/people.service";
import { getInitials } from "../../people/_components/people-staff-model";

type AvailabilityPageClientProps = {
  organisation: string;
  venue: string;
};

type AvailabilitySlot = {
  available: boolean;
  /** HH:mm when set; both unset = all day. */
  startTime: string | null;
  endTime: string | null;
};

type StaffAvailabilityRow = {
  member: VenueStaffMember;
  days: (AvailabilitySlot | null)[];
};

function countAvailableDays(days: (AvailabilitySlot | null)[]): number {
  return days.filter((s) => s?.available === true).length;
}

type AvailabilityApiRow = {
  userProfileId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  availableStartTime?: string | null;
  availableEndTime?: string | null;
};

type AvailCellDto = {
  isAvailable: boolean;
  availableStartTime: string | null;
  availableEndTime: string | null;
};

function slotFromDto(d: AvailCellDto): AvailabilitySlot {
  return {
    available: d.isAvailable,
    startTime: d.availableStartTime ?? null,
    endTime: d.availableEndTime ?? null,
  };
}

function formatTimeAu(hhmm: string | null | undefined): string {
  if (!hhmm) return "";
  const parts = hhmm.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  const ap = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ap}` : `${h12}:${String(m).padStart(2, "0")}${ap}`;
}

function slotCellSummary(slot: AvailabilitySlot | null): { title: string; lines: [string] | [string, string] } {
  if (slot === null) {
    return { title: "Inherit default", lines: ["—"] };
  }
  if (!slot.available) {
    return { title: "Unavailable", lines: ["Unavailable"] };
  }
  const hasWindow = slot.startTime && slot.endTime;
  if (!hasWindow) {
    return { title: "Available (all day)", lines: ["Available", "All day"] };
  }
  return {
    title: `Available ${formatTimeAu(slot.startTime)}–${formatTimeAu(slot.endTime)}`,
    lines: ["Available", `${formatTimeAu(slot.startTime)}–${formatTimeAu(slot.endTime)}`],
  };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function isoMondayToWeekRangeLabel(iso: string): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 0;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const start = new Date(y, mo - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const short = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
  const full = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });
  return `${short.format(start)} – ${full.format(end)}`;
}

function staffAvailabilityRows(
  staff: VenueStaffMember[],
  availability: AvailabilityApiRow[]
): StaffAvailabilityRow[] {
  const slotMap = new Map<string, Map<number, AvailCellDto>>();
  for (const row of availability) {
    if (!slotMap.has(row.userProfileId)) slotMap.set(row.userProfileId, new Map());
    slotMap.get(row.userProfileId)!.set(row.dayOfWeek, {
      isAvailable: row.isAvailable,
      availableStartTime: row.availableStartTime ?? null,
      availableEndTime: row.availableEndTime ?? null,
    });
  }
  return staff.map((s) => ({
    member: s,
    days: Array.from({ length: 7 }, (_, d) => {
      const m = slotMap.get(s.id);
      if (!m || !m.has(d)) return null;
      return slotFromDto(m.get(d)!);
    }),
  }));
}

/** Week-specific rows override recurring template for display (same rules as roster). */
function mergedStaffAvailabilityRows(
  staff: VenueStaffMember[],
  recurring: AvailabilityApiRow[],
  weekInstance: AvailabilityApiRow[]
): StaffAvailabilityRow[] {
  const recMap = new Map<string, Map<number, AvailCellDto>>();
  const wMap = new Map<string, Map<number, AvailCellDto>>();
  for (const row of recurring) {
    if (!recMap.has(row.userProfileId)) recMap.set(row.userProfileId, new Map());
    recMap.get(row.userProfileId)!.set(row.dayOfWeek, {
      isAvailable: row.isAvailable,
      availableStartTime: row.availableStartTime ?? null,
      availableEndTime: row.availableEndTime ?? null,
    });
  }
  for (const row of weekInstance) {
    if (!wMap.has(row.userProfileId)) wMap.set(row.userProfileId, new Map());
    wMap.get(row.userProfileId)!.set(row.dayOfWeek, {
      isAvailable: row.isAvailable,
      availableStartTime: row.availableStartTime ?? null,
      availableEndTime: row.availableEndTime ?? null,
    });
  }
  return staff.map((s) => ({
    member: s,
    days: Array.from({ length: 7 }, (_, d) => {
      const w = wMap.get(s.id)?.get(d);
      const t = recMap.get(s.id)?.get(d);
      const eff = w !== undefined ? w : t;
      if (eff === undefined) return null;
      return slotFromDto(eff);
    }),
  }));
}

function getMondayIsoFromDate(d: Date): string {
  const monday = new Date(d);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const dayNum = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 0;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, mo - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Monday ISO (yyyy-mm-dd) → seven calendar dates Mon–Sun. */
function weekDatesFromMondayIso(iso: string): Date[] {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 0;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const monday = new Date(y, mo - 1, d);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

type AvailabilityApiPayload = {
  staff: VenueStaffMember[];
  recurringAvailability: AvailabilityApiRow[];
  weekInstanceAvailability: AvailabilityApiRow[];
};

type CellEditorState = {
  member: VenueStaffMember;
  dayIdx: number;
  slot: AvailabilitySlot | null;
};

function AvailabilityRosterGrid({
  view,
  weekStartMondayIso,
  loading,
  rows,
  emptyMessage,
  patchBodyExtra,
  onPatched,
  apiBase,
}: {
  view: "week" | "default";
  weekStartMondayIso: string;
  loading: boolean;
  rows: StaffAvailabilityRow[];
  emptyMessage: string;
  patchBodyExtra: Record<string, string | undefined>;
  onPatched: () => void;
  apiBase: string;
}) {
  const weekDates = view === "week" ? weekDatesFromMondayIso(weekStartMondayIso) : null;

  const [editor, setEditor] = useState<CellEditorState | null>(null);
  const [status, setStatus] = useState<"inherit" | "unavailable" | "available">("inherit");
  const [useSpecificHours, setUseSpecificHours] = useState(false);
  const [startStr, setStartStr] = useState("09:00");
  const [endStr, setEndStr] = useState("17:00");
  const [saving, setSaving] = useState(false);

  function openCell(member: VenueStaffMember, dayIdx: number, slot: AvailabilitySlot | null) {
    setEditor({ member, dayIdx, slot });
    if (slot === null) {
      setStatus("inherit");
      setUseSpecificHours(false);
      setStartStr("09:00");
      setEndStr("17:00");
    } else if (!slot.available) {
      setStatus("unavailable");
      setUseSpecificHours(false);
      setStartStr("09:00");
      setEndStr("17:00");
    } else {
      setStatus("available");
      const hasWindow = !!(slot.startTime && slot.endTime);
      setUseSpecificHours(hasWindow);
      setStartStr((slot.startTime ?? "09:00").slice(0, 5));
      setEndStr((slot.endTime ?? "17:00").slice(0, 5));
    }
  }

  async function saveEditor() {
    if (!editor) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        userProfileId: editor.member.id,
        dayOfWeek: editor.dayIdx,
        ...patchBodyExtra,
      };
      if (status === "inherit") {
        body.isAvailable = null;
      } else if (status === "unavailable") {
        body.isAvailable = false;
      } else {
        body.isAvailable = true;
        if (useSpecificHours) {
          body.availableStartTime = startStr;
          body.availableEndTime = endStr;
        }
      }

      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error: { message: string } | null };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Could not update");
        return;
      }
      setEditor(null);
      onPatched();
    } finally {
      setSaving(false);
    }
  }

  const dayLabelForEditor =
    editor !== null ? DAYS[editor.dayIdx] : "";

  return (
    <>
      <div className="min-w-[900px]">
        <div className="sticky top-0 z-10 grid grid-cols-[200px_repeat(7,1fr)] border-b bg-muted/80 backdrop-blur">
          <div className="flex items-center border-r px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff</span>
          </div>
          {DAYS.map((d, i) => {
            if (weekDates) {
              const date = weekDates[i]!;
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={d}
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
                      {d}
                    </span>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={d}
                className="flex items-center justify-center border-r px-2.5 py-2 last:border-r-0"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {d}
                </span>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          rows.map((row) => {
            const { member } = row;
            const badgeLabel =
              member.positionSlug && member.positionDisplayName
                ? positionShortLabel(member.positionSlug, member.positionDisplayName)
                : "—";
            const availDays = countAvailableDays(row.days);
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
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {availDays}d
                      </span>
                    </div>
                  </div>
                </div>
                {row.days.map((slot, dayIdx) => {
                  const summary = slotCellSummary(slot);
                  const isToday =
                    weekDates !== null &&
                    weekDates[dayIdx]!.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={DAYS[dayIdx]}
                      className={cn(
                        "relative flex min-h-[56px] items-center justify-center border-r p-1 last:border-r-0",
                        isToday && "bg-blue-50/40 dark:bg-blue-950/20"
                      )}
                    >
                      <button
                        type="button"
                        title={summary.title}
                        onClick={() => openCell(member, dayIdx, slot)}
                        className={cn(
                          "flex w-[min(100%,7.5rem)] flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-1.5 text-center text-xs font-medium transition-colors",
                          slot === null
                            ? "border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                            : slot.available
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "border-gray-200 bg-gray-100 text-gray-500 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {summary.lines.length === 1 ? (
                          <span className={slot === null ? "opacity-50" : undefined}>{summary.lines[0]}</span>
                        ) : (
                          <>
                            <span className="text-[11px] font-semibold leading-tight">{summary.lines[0]}</span>
                            <span className="text-[10px] font-normal leading-tight opacity-80">
                              {summary.lines[1]}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      <Sheet
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
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
            <SheetTitle>Availability</SheetTitle>
            <SheetDescription>
              {editor ? (
                <>
                  {editor.member.name} · {dayLabelForEditor}
                </>
              ) : null}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="avail-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  if (v === "inherit" || v === "unavailable" || v === "available") {
                    setStatus(v);
                  }
                }}
              >
                <SelectTrigger id="avail-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Inherit (no override)</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === "available" ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="avail-specific-hours"
                    checked={useSpecificHours}
                    onCheckedChange={(v) => setUseSpecificHours(v === true)}
                  />
                  <Label htmlFor="avail-specific-hours" className="cursor-pointer font-normal">
                    Specific hours (otherwise all day)
                  </Label>
                </div>
                {useSpecificHours ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="avail-start">From</Label>
                      <Input
                        id="avail-start"
                        type="time"
                        value={startStr}
                        onChange={(e) => setStartStr(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="avail-end">To</Label>
                      <Input
                        id="avail-end"
                        type="time"
                        value={endStr}
                        onChange={(e) => setEndStr(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <SheetFooter className="gap-2 border-t px-4 py-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setEditor(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEditor()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function AvailabilityPageClient({ organisation, venue }: AvailabilityPageClientProps) {
  const [availabilityView, setAvailabilityView] = useState<"week" | "default">("week");
  const [weekStartMondayIso, setWeekStartMondayIso] = useState(() => getMondayIsoFromDate(new Date()));

  const [recurringRows, setRecurringRows] = useState<StaffAvailabilityRow[]>([]);
  const [weekRows, setWeekRows] = useState<StaffAvailabilityRow[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(true);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [weekError, setWeekError] = useState<string | null>(null);

  const apiBase = `/api/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/workforce/availability`;
  const leaveHref = buildScopedPath(organisation, venue, "workforce/leave");

  const weekRangeLabel = useMemo(() => isoMondayToWeekRangeLabel(weekStartMondayIso), [weekStartMondayIso]);

  const loadDefaultPattern = useCallback(async () => {
    setRecurringLoading(true);
    setRecurringError(null);
    try {
      const res = await fetch(apiBase);
      const json = (await res.json()) as {
        data: AvailabilityApiPayload | null;
        error: { message: string } | null;
      };
      if (!res.ok || json.error || !json.data) {
        setRecurringError(json.error?.message ?? "Could not load availability");
        setRecurringRows([]);
        return;
      }
      setRecurringRows(staffAvailabilityRows(json.data.staff, json.data.recurringAvailability));
    } catch {
      setRecurringError("Could not load availability");
      setRecurringRows([]);
    } finally {
      setRecurringLoading(false);
    }
  }, [apiBase]);

  const loadWeekView = useCallback(async () => {
    setWeekLoading(true);
    setWeekError(null);
    try {
      const params = new URLSearchParams({ weekStartMonday: weekStartMondayIso });
      const res = await fetch(`${apiBase}?${params}`);
      const json = (await res.json()) as {
        data: AvailabilityApiPayload | null;
        error: { message: string } | null;
      };
      if (!res.ok || json.error || !json.data) {
        setWeekError(json.error?.message ?? "Could not load availability");
        setWeekRows([]);
        return;
      }
      setWeekRows(
        mergedStaffAvailabilityRows(
          json.data.staff,
          json.data.recurringAvailability,
          json.data.weekInstanceAvailability
        )
      );
    } catch {
      setWeekError("Could not load availability");
      setWeekRows([]);
    } finally {
      setWeekLoading(false);
    }
  }, [apiBase, weekStartMondayIso]);

  useEffect(() => {
    void loadDefaultPattern();
  }, [loadDefaultPattern]);

  useEffect(() => {
    void loadWeekView();
  }, [loadWeekView]);

  const gridLoading =
    availabilityView === "week" ? weekLoading : recurringLoading;
  const gridError = availabilityView === "week" ? weekError : recurringError;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
            {gridLoading ? <span className="text-sm text-muted-foreground">Loading…</span> : null}
            {gridError ? <span className="text-sm text-destructive">{gridError}</span> : null}
          </div>
          {availabilityView === "week" ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setWeekStartMondayIso((w) => addDaysToIsoDate(w, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-[160px] max-w-[280px] shrink truncate px-2 text-xs font-medium sm:min-w-[200px]"
                onClick={() => setWeekStartMondayIso(getMondayIsoFromDate(new Date()))}
              >
                <span className="truncate">{weekRangeLabel}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setWeekStartMondayIso((w) => addDaysToIsoDate(w, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
        <p className="shrink-0 text-xs text-muted-foreground sm:text-sm">
          {organisation} · {venue}
        </p>
      </div>

      <Separator className="shrink-0" />

      <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
            <Link href={leaveHref}>
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              Manage leave
            </Link>
          </Button>
          {availabilityView === "week" ? (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              onClick={async () => {
                const to = addDaysToIsoDate(weekStartMondayIso, 7);
                const res = await fetch(apiBase, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "copy_week",
                    fromWeekStartMonday: weekStartMondayIso,
                    toWeekStartMonday: to,
                  }),
                });
                const json = (await res.json()) as { error: { message: string } | null };
                if (!res.ok || json.error) {
                  toast.error(json.error?.message ?? "Could not copy week");
                  return;
                }
                toast.success(`Copied to week starting ${to}`);
              }}
            >
              Copy → next week
            </Button>
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0">
          <ToggleGroup
            type="single"
            value={availabilityView}
            onValueChange={(v) => {
              if (v === "week" || v === "default") setAvailabilityView(v);
            }}
            variant="outline"
            size="sm"
            spacing={0}
            className="shrink-0"
          >
            <ToggleGroupItem value="week" aria-label="By week" className="h-8 text-xs">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="default" aria-label="Default pattern" className="h-8 text-xs">
              Default
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0 py-0 shadow-sm">
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 !py-0">
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
            {availabilityView === "week" ? (
              <AvailabilityRosterGrid
                view="week"
                weekStartMondayIso={weekStartMondayIso}
                loading={weekLoading}
                rows={weekRows}
                emptyMessage="No staff at this venue yet."
                patchBodyExtra={{ weekStartMonday: weekStartMondayIso }}
                onPatched={() => {
                  void loadWeekView();
                  void loadDefaultPattern();
                }}
                apiBase={apiBase}
              />
            ) : (
              <AvailabilityRosterGrid
                view="default"
                weekStartMondayIso={weekStartMondayIso}
                loading={recurringLoading}
                rows={recurringRows}
                emptyMessage="No staff at this venue yet."
                patchBodyExtra={{}}
                onPatched={() => {
                  void loadDefaultPattern();
                  void loadWeekView();
                }}
                apiBase={apiBase}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
