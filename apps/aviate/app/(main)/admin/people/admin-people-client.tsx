"use client";

import * as React from "react";
import { Search, Users } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
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
import { cn } from "@workspace/ui/lib/utils";

import { PageHeader } from "@/components/molecules/page-header";
import type { Employee } from "@/entities/employees/api/endpoints";
import { useAdminEmployees } from "@/hooks/employees/use-employees";
import { useStations } from "@/hooks/rostering/use-rostering";
import { EmployeeDetailDrawer, statusTone } from "./components/employee-detail-drawer";

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  casual: "Casual",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AdminPeopleClient() {
  const { data: employees, isLoading } = useAdminEmployees();
  const { data: stations } = useStations();

  const [search, setSearch] = React.useState("");
  const [stationFilter, setStationFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<Employee | null>(null);
  const [open, setOpen] = React.useState(false);

  // Lookups for station code + department name.
  const stationById = React.useMemo(
    () => new Map((stations ?? []).map((s) => [s.id, s])),
    [stations]
  );
  const departmentById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stations ?? []) {
      for (const d of s.departments) map.set(d.id, d.name);
    }
    return map;
  }, [stations]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (employees ?? []).filter((e) => {
      if (stationFilter !== "all" && e.station_id !== stationFilter)
        return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (!q) return true;
      return [e.full_name, e.employee_code, e.email, e.job_title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [employees, search, stationFilter, statusFilter]);

  const openEmployee = (e: Employee) => {
    setSelected(e);
    setOpen(true);
  };

  return (
    <div className="space-y-4 py-6">
      <PageHeader
        title="Employees"
        subtitle="Manage employee records, roles, and assignments"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, email…"
            className="pl-9"
          />
        </div>
        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Station" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stations</SelectItem>
            {(stations ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.iata_code} — {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-[420px] w-full" />
      ) : filtered.length === 0 ? (
        <Empty className="min-h-[40vh]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No employees found</EmptyTitle>
            <EmptyDescription>
              {employees && employees.length > 0
                ? "No employees match the current filters."
                : "Once your organisation has employees, they appear here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Station</th>
                  <th className="px-4 py-3 text-left font-medium">Department</th>
                  <th className="px-4 py-3 text-left font-medium">Job title</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => openEmployee(e)}
                    className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {initials(e.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {e.full_name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {e.email ?? e.employee_code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.station_id
                        ? (stationById.get(e.station_id)?.iata_code ?? "—")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.department_id
                        ? (departmentById.get(e.department_id) ?? "—")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{e.job_title ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABELS[e.employment_type] ?? e.employment_type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "border-transparent capitalize",
                          statusTone(e.status)
                        )}
                      >
                        {e.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="px-1 text-xs text-muted-foreground">
        {filtered.length} of {employees?.length ?? 0} employees
      </p>

      <EmployeeDetailDrawer
        employee={selected}
        stations={stations ?? []}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
