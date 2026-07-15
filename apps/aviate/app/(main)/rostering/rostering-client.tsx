"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import {
  useRosterPeriodDetail,
  useRosterPeriods,
  useSetRosterPeriodStatus,
  useStations,
} from "@/hooks/rostering/use-rostering";
import { CreatePeriodDialog } from "./components/create-period-dialog";
import { RosterGrid } from "./components/roster-grid";

const statusVariant = {
  draft: "secondary",
  published: "default",
  locked: "outline",
} as const;

export function RosteringClient() {
  const { data: stations, isLoading: stationsLoading } = useStations();
  const [stationId, setStationId] = React.useState<string | null>(null);
  const [periodId, setPeriodId] = React.useState<string | null>(null);

  const effectiveStationId = stationId ?? stations?.[0]?.id ?? null;
  const station =
    stations?.find((s) => s.id === effectiveStationId) ?? null;

  const { data: periods, isLoading: periodsLoading } =
    useRosterPeriods(effectiveStationId);

  const effectivePeriodId = periodId ?? periods?.[0]?.id ?? null;
  const period = periods?.find((p) => p.id === effectivePeriodId) ?? null;

  const { data: periodDetail } = useRosterPeriodDetail(effectivePeriodId);
  const setStatus = useSetRosterPeriodStatus(effectiveStationId);

  const handlePublish = () => {
    if (!period) return;
    const next = period.status === "draft" ? "published" : "draft";
    setStatus.mutate(
      { id: period.id, status: next },
      {
        onSuccess: () =>
          toast.success(
            next === "published" ? "Roster published" : "Roster back to draft"
          ),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  if (stationsLoading) {
    return (
      <div className="space-y-4 py-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (!stations || stations.length === 0) {
    return (
      <Empty className="min-h-[60vh]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarClock />
          </EmptyMedia>
          <EmptyTitle>No stations yet</EmptyTitle>
          <EmptyDescription>
            Once your organisation has stations (airports) set up, rosters are
            planned here per station and department. If you just signed up,
            your account may not be attached to an organisation yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rostering</h1>
          <p className="text-sm text-muted-foreground">
            Plan shifts by station and department.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            value={effectiveStationId ?? undefined}
            onValueChange={(v) => {
              setStationId(v);
              setPeriodId(null);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Station" />
            </SelectTrigger>
            <SelectContent>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.iata_code} - {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={effectivePeriodId ?? undefined}
            onValueChange={setPeriodId}
            disabled={periodsLoading || !periods?.length}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue
                placeholder={periodsLoading ? "Loading…" : "Roster period"}
              />
            </SelectTrigger>
            <SelectContent>
              {(periods ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {effectiveStationId ? (
            <CreatePeriodDialog
              stationId={effectiveStationId}
              onCreated={(id) => setPeriodId(id)}
            />
          ) : null}
        </div>
      </div>

      {period ? (
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[period.status]}>{period.status}</Badge>
          <span className="text-sm text-muted-foreground">
            {period.starts_on} → {period.ends_on}
          </span>
          {period.status !== "locked" ? (
            <Button
              size="sm"
              variant={period.status === "draft" ? "default" : "outline"}
              onClick={handlePublish}
              disabled={setStatus.isPending}
            >
              {period.status === "draft" ? "Publish" : "Unpublish"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {period && station && periodDetail ? (
        <RosterGrid period={periodDetail} station={station} />
      ) : period ? (
        <Skeleton className="h-[420px] w-full" />
      ) : (
        <Empty className="min-h-[40vh]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarClock />
            </EmptyMedia>
            <EmptyTitle>No roster periods</EmptyTitle>
            <EmptyDescription>
              Create a roster period for {station?.name ?? "this station"} to
              start planning shifts.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
