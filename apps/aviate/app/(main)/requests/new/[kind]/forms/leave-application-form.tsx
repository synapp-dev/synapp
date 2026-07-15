"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";

import { useCreateRequest } from "@/hooks/requests/use-requests";
import { RequestFormShell } from "./form-shell";

const LEAVE_TYPES = [
  "Annual Leave",
  "Personal / Sick Leave",
  "Carer's Leave",
  "RDO",
  "Long Service Leave",
  "Other",
] as const;

export function LeaveApplicationForm() {
  const router = useRouter();
  const create = useCreateRequest();

  const [leaveType, setLeaveType] =
    React.useState<(typeof LEAVE_TYPES)[number]>("Annual Leave");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [hours, setHours] = React.useState("");
  const [returnDate, setReturnDate] = React.useState("");
  const [publicHolidays, setPublicHolidays] = React.useState("0");
  const [certificateAttached, setCertificateAttached] = React.useState(false);
  const [payHolidays, setPayHolidays] = React.useState("as_normal");
  const [reason, setReason] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Enter the first and last day of leave");
      return;
    }
    if (endDate < startDate) {
      toast.error("The last day must be on or after the first day");
      return;
    }
    const range = `${format(parseISO(startDate), "dd MMM")}–${format(
      parseISO(endDate),
      "dd MMM yyyy"
    )}`;
    try {
      const detail = await create.mutateAsync({
        kind: "leave_application",
        title: `${leaveType} · ${range}`,
        payload: {
          leaveType,
          startDate,
          endDate,
          hours: hours ? Number(hours) : null,
          returnDate: returnDate || null,
          publicHolidays: Number(publicHolidays) || 0,
          certificateAttached,
          payHolidays,
          reason,
        },
      });
      toast.success("Leave application submitted for approval");
      router.push(`/requests/${detail.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <RequestFormShell kind="leave_application">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>Type of leave</Label>
          <Select
            value={leaveType}
            onValueChange={(v) =>
              setLeaveType(v as (typeof LEAVE_TYPES)[number])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAVE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="start">First day of leave</Label>
            <Input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end">Last day of leave</Label>
            <Input
              id="end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="hours">Number of hours</Label>
            <Input
              id="hours"
              type="number"
              min={0}
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="76"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ph">Public holidays</Label>
            <Input
              id="ph"
              type="number"
              min={0}
              value={publicHolidays}
              onChange={(e) => setPublicHolidays(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ret">Date of return</Label>
            <Input
              id="ret"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>How should holiday pay be paid?</Label>
          <RadioGroup value={payHolidays} onValueChange={setPayHolidays}>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="as_normal" /> As normal (as pay days fall
              due)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="prepay" /> Pre-payment of holiday pay &
              loading
            </label>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Pre-payment requires the form 14 days before leave commences.
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm">
          <Checkbox
            checked={certificateAttached}
            onCheckedChange={(v) => setCertificateAttached(v === true)}
          />
          Medical certificate attached (required for sick / carer’s leave)
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="reason">Reason / notes</Label>
          <Textarea
            id="reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional context for your supervisor."
          />
        </div>

        <Button
          type="submit"
          disabled={create.isPending}
          className="w-full bg-orange-500 text-white hover:bg-orange-600"
        >
          {create.isPending ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </RequestFormShell>
  );
}
