"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Textarea } from "@workspace/ui/components/textarea";

import {
  useCreateRequest,
  useMyEmployee,
  useOrgEmployees,
} from "@/hooks/requests/use-requests";
import { RequestFormShell } from "./form-shell";

export function ShiftSwapForm() {
  const router = useRouter();
  const create = useCreateRequest();
  const { data: me } = useMyEmployee();
  const { data: employees } = useOrgEmployees();

  const [requesteeId, setRequesteeId] = React.useState("");
  const [rosteredDate, setRosteredDate] = React.useState("");
  const [rosteredTime, setRosteredTime] = React.useState("");
  const [requestedDate, setRequestedDate] = React.useState("");
  const [requestedTime, setRequestedTime] = React.useState("");
  const [reason, setReason] = React.useState("");

  // Anyone but yourself can be the counterparty.
  const counterparties = (employees ?? []).filter((e) => e.id !== me?.id);
  const requesteeName =
    counterparties.find((e) => e.id === requesteeId)?.full_name ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesteeId) {
      toast.error("Choose the colleague you’re swapping with");
      return;
    }
    if (!rosteredDate || !requestedDate) {
      toast.error("Enter both the rostered and requested shift dates");
      return;
    }
    try {
      const detail = await create.mutateAsync({
        kind: "shift_swap",
        title: `Shift swap with ${requesteeName}`,
        payload: {
          requesteeEmployeeId: requesteeId,
          requesteeName,
          rosteredDate,
          rosteredTime,
          requestedDate,
          requestedTime,
          reason,
        },
      });
      toast.success("Shift swap submitted — awaiting your colleague");
      router.push(`/requests/${detail.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <RequestFormShell kind="shift_swap">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>Swap with</Label>
          <Select value={requesteeId} onValueChange={setRequesteeId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a colleague" />
            </SelectTrigger>
            <SelectContent>
              {counterparties.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name}
                  {e.job_title ? ` · ${e.job_title}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            They must be able to work your classification. Limit of 2 swaps per
            fortnight.
          </p>
        </div>

        <fieldset className="space-y-3 rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            Your rostered shift
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rd">Date</Label>
              <Input
                id="rd"
                type="date"
                value={rosteredDate}
                onChange={(e) => setRosteredDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt">Time</Label>
              <Input
                id="rt"
                value={rosteredTime}
                onChange={(e) => setRosteredTime(e.target.value)}
                placeholder="0600–1400"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            Requested shift
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qd">Date</Label>
              <Input
                id="qd"
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qt">Time</Label>
              <Input
                id="qt"
                value={requestedTime}
                onChange={(e) => setRequestedTime(e.target.value)}
                placeholder="1400–2200"
              />
            </div>
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional."
          />
        </div>

        <Button
          type="submit"
          disabled={create.isPending}
          className="w-full bg-orange-500 text-white hover:bg-orange-600"
        >
          {create.isPending ? "Submitting…" : "Submit swap request"}
        </Button>
      </form>
    </RequestFormShell>
  );
}
