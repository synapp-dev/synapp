"use client";

import * as React from "react";
import { Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import type {
  RosterPeriodStatus,
  Shift,
  Station,
} from "@/entities/rostering/model/types";
import {
  useAssignEmployee,
  useDeleteShift,
  useEmployees,
  useUnassignEmployee,
} from "@/hooks/rostering/use-rostering";
import { formatDayHeading, formatTime } from "@/lib/rostering";

interface ShiftDialogProps {
  shift: Shift | null;
  station: Station;
  periodId: string;
  periodStatus: RosterPeriodStatus;
  onClose: () => void;
}

export function ShiftDialog({
  shift,
  station,
  periodId,
  periodStatus,
  onClose,
}: ShiftDialogProps) {
  const { data: employees } = useEmployees(shift ? station.id : null);
  const assign = useAssignEmployee(periodId);
  const unassign = useUnassignEmployee(periodId);
  const deleteShift = useDeleteShift(periodId);
  const [employeeToAdd, setEmployeeToAdd] = React.useState<string>("");

  if (!shift) return null;

  const editable = periodStatus !== "locked";
  const assignedIds = new Set(shift.assignments.map((a) => a.employee_id));
  const available = (employees ?? []).filter((e) => !assignedIds.has(e.id));
  const department = station.departments.find(
    (d) => d.id === shift.department_id
  );
  const { day, date } = formatDayHeading(shift.shift_date);
  const short = shift.assignments.length < shift.required_headcount;

  const handleAssign = () => {
    if (!employeeToAdd) return;
    assign.mutate(
      { shiftId: shift.id, employeeId: employeeToAdd },
      {
        onSuccess: () => setEmployeeToAdd(""),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDelete = () => {
    deleteShift.mutate(shift.id, {
      onSuccess: () => {
        toast.success("Shift removed");
        onClose();
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {department?.name ?? "Shift"} - {day} {date}
          </DialogTitle>
          <DialogDescription>
            {formatTime(shift.start_time)}–{formatTime(shift.end_time)} at{" "}
            {station.iata_code}
            {shift.notes ? ` · ${shift.notes}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Crew</span>
            <Badge variant={short ? "destructive" : "secondary"}>
              {shift.assignments.length}/{shift.required_headcount}
            </Badge>
          </div>

          {shift.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one assigned yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {shift.assignments.map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {assignment.employee?.full_name ?? "Unknown"}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {assignment.employee?.employee_code}
                      {assignment.employee?.job_title
                        ? ` · ${assignment.employee.job_title}`
                        : ""}
                    </span>
                  </div>
                  {editable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        unassign.mutate(assignment.id, {
                          onError: (e) => toast.error(e.message),
                        })
                      }
                      disabled={unassign.isPending}
                      aria-label={`Remove ${assignment.employee?.full_name ?? "employee"}`}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {editable ? (
            <div className="flex items-center gap-2">
              <Select value={employeeToAdd} onValueChange={setEmployeeToAdd}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add crew member…" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} ({employee.employee_code})
                      {shift.department_id &&
                      employee.department_id !== shift.department_id
                        ? " - other dept"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleAssign}
                disabled={!employeeToAdd || assign.isPending}
              >
                Assign
              </Button>
            </div>
          ) : null}
        </div>

        {editable ? (
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteShift.isPending}
            >
              <Trash2 className="w-4 h-4" />
              Delete shift
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
