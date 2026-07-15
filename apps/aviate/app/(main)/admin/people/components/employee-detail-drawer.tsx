"use client";

import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
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
import { cn } from "@workspace/ui/lib/utils";

import type { Employee } from "@/entities/employees/api/endpoints";
import type { Station } from "@/entities/rostering/model/types";
import { useUpdateEmployee } from "@/hooks/employees/use-employees";
import { STATUS_TONE } from "@/lib/aviate-demo";

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "casual", label: "Casual" },
] as const;

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "onboarding", label: "Onboarding" },
  { value: "inactive", label: "Inactive" },
] as const;

export function statusTone(status: string) {
  if (status === "active") return STATUS_TONE.positive;
  if (status === "onboarding") return STATUS_TONE.warning;
  return STATUS_TONE.neutral;
}

// The editable subset of an employee, all as strings for form control.
type FormState = {
  full_name: string;
  employee_code: string;
  email: string;
  phone: string;
  job_title: string;
  employment_type: string;
  status: string;
  station_id: string;
  department_id: string;
  started_on: string;
};

function toForm(e: Employee): FormState {
  return {
    full_name: e.full_name ?? "",
    employee_code: e.employee_code ?? "",
    email: e.email ?? "",
    phone: e.phone ?? "",
    job_title: e.job_title ?? "",
    employment_type: e.employment_type,
    status: e.status,
    station_id: e.station_id ?? "",
    department_id: e.department_id ?? "",
    started_on: e.started_on ?? "",
  };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function EmployeeDetailDrawer({
  employee,
  stations,
  open,
  onOpenChange,
}: {
  employee: Employee | null;
  stations: Station[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateEmployee();
  const [form, setForm] = React.useState<FormState | null>(null);

  // Re-seed the form whenever a different employee is opened.
  React.useEffect(() => {
    setForm(employee ? toForm(employee) : null);
  }, [employee]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const departments = React.useMemo(() => {
    const station = stations.find((s) => s.id === form?.station_id);
    return station?.departments ?? [];
  }, [stations, form?.station_id]);

  const dirty = React.useMemo(() => {
    if (!employee || !form) return false;
    return JSON.stringify(form) !== JSON.stringify(toForm(employee));
  }, [employee, form]);

  const handleStationChange = (stationId: string) => {
    setForm((f) => {
      if (!f) return f;
      const station = stations.find((s) => s.id === stationId);
      const stillValid = station?.departments.some(
        (d) => d.id === f.department_id
      );
      return {
        ...f,
        station_id: stationId,
        department_id: stillValid ? f.department_id : "",
      };
    });
  };

  const handleSave = () => {
    if (!employee || !form) return;
    if (!form.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!form.employee_code.trim()) {
      toast.error("Employee code is required");
      return;
    }
    update.mutate(
      {
        id: employee.id,
        patch: {
          full_name: form.full_name.trim(),
          employee_code: form.employee_code.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          job_title: form.job_title.trim() || null,
          employment_type:
            form.employment_type as Employee["employment_type"],
          status: form.status as Employee["status"],
          station_id: form.station_id || null,
          department_id: form.department_id || null,
          started_on: form.started_on || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Employee updated");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        {employee && form ? (
          <>
            <SheetHeader className="border-b p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {initials(form.full_name || employee.full_name)}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-base">
                    {form.full_name || "Employee"}
                  </SheetTitle>
                  <SheetDescription className="truncate">
                    {employee.employee_code}
                  </SheetDescription>
                </div>
                <Badge
                  className={cn(
                    "ml-auto border-transparent capitalize",
                    statusTone(form.status)
                  )}
                >
                  {form.status}
                </Badge>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
              <Section title="Personal">
                <Field label="Full name">
                  <Input
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Employee code">
                    <Input
                      value={form.employee_code}
                      onChange={(e) => set("employee_code", e.target.value)}
                    />
                  </Field>
                  <Field label="Started on">
                    <Input
                      type="date"
                      value={form.started_on}
                      onChange={(e) => set("started_on", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="name@menzies.com"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+44 …"
                  />
                </Field>
              </Section>

              <Section title="Role">
                <Field label="Job title">
                  <Input
                    value={form.job_title}
                    onChange={(e) => set("job_title", e.target.value)}
                    placeholder="e.g. Ramp Agent"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Employment type">
                    <Select
                      value={form.employment_type}
                      onValueChange={(v) => set("employment_type", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select
                      value={form.status}
                      onValueChange={(v) => set("status", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              <Section title="Assignment">
                <Field label="Station">
                  <Select
                    value={form.station_id || undefined}
                    onValueChange={handleStationChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.iata_code} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Department">
                  <Select
                    value={form.department_id || undefined}
                    onValueChange={(v) => set("department_id", v)}
                    disabled={!form.station_id || departments.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          form.station_id ? "Unassigned" : "Pick a station first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </Section>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!dirty || update.isPending}
                className="bg-orange-500 text-white hover:bg-orange-600"
              >
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
