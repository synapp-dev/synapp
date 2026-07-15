"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import {
  useCreateShift,
  useShiftTemplates,
} from "@/hooks/rostering/use-rostering";
import { formatDayHeading, formatTime } from "@/lib/rostering";

interface CreateShiftDialogProps {
  periodId: string;
  stationId: string;
  departmentId: string | null;
  date: string;
  onClose: () => void;
}

const NO_TEMPLATE = "__custom__";

export function CreateShiftDialog({
  periodId,
  stationId,
  departmentId,
  date,
  onClose,
}: CreateShiftDialogProps) {
  const { data: templates } = useShiftTemplates(stationId);
  const createShift = useCreateShift(periodId);

  const [templateId, setTemplateId] = React.useState<string>(NO_TEMPLATE);
  const [startTime, setStartTime] = React.useState("06:00");
  const [endTime, setEndTime] = React.useState("14:00");
  const [headcount, setHeadcount] = React.useState(1);

  const relevantTemplates = (templates ?? []).filter(
    (t) => !departmentId || !t.department_id || t.department_id === departmentId
  );

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === NO_TEMPLATE) return;
    const template = relevantTemplates.find((t) => t.id === id);
    if (template) {
      setStartTime(formatTime(template.start_time));
      setEndTime(formatTime(template.end_time));
      setHeadcount(template.required_headcount);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createShift.mutate(
      {
        rosterPeriodId: periodId,
        departmentId,
        templateId: templateId === NO_TEMPLATE ? null : templateId,
        shiftDate: date,
        startTime,
        endTime,
        requiredHeadcount: headcount,
      },
      {
        onSuccess: () => {
          toast.success("Shift added");
          onClose();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const { day, date: dateLabel } = formatDayHeading(date);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              New shift - {day} {dateLabel}
            </DialogTitle>
            <DialogDescription>
              Times are local to the station. An end time earlier than the
              start time means the shift runs past midnight.
            </DialogDescription>
          </DialogHeader>

          {relevantTemplates.length > 0 ? (
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE}>Custom shift</SelectItem>
                  {relevantTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({formatTime(t.start_time)}–{formatTime(t.end_time)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shift-start">Start</Label>
              <Input
                id="shift-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end">End</Label>
              <Input
                id="shift-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-headcount">Crew needed</Label>
              <Input
                id="shift-headcount"
                type="number"
                min={1}
                max={99}
                value={headcount}
                onChange={(e) => setHeadcount(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createShift.isPending}>
              {createShift.isPending ? "Adding…" : "Add shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
