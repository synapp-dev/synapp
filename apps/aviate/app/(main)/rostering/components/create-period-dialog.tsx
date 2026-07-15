"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { useCreateRosterPeriod } from "@/hooks/rostering/use-rostering";

interface CreatePeriodDialogProps {
  stationId: string;
  onCreated: (periodId: string) => void;
}

export function CreatePeriodDialog({
  stationId,
  onCreated,
}: CreatePeriodDialogProps) {
  const [open, setOpen] = React.useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const [name, setName] = React.useState("");
  const [startsOn, setStartsOn] = React.useState(today);
  const [endsOn, setEndsOn] = React.useState(
    format(addDays(new Date(), 6), "yyyy-MM-dd")
  );

  const createPeriod = useCreateRosterPeriod(stationId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createPeriod.mutate(
      { stationId, name, startsOn, endsOn },
      {
        onSuccess: (created) => {
          toast.success(`Roster period "${created.name}" created`);
          setOpen(false);
          setName("");
          onCreated(created.id);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4" />
          New period
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New roster period</DialogTitle>
            <DialogDescription>
              A period is the window you plan and publish as one roster -
              typically a week or fortnight.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="period-name">Name</Label>
            <Input
              id="period-name"
              placeholder="e.g. Week 30 - 20–26 Jul"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-start">Starts</Label>
              <Input
                id="period-start"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">Ends</Label>
              <Input
                id="period-end"
                type="date"
                value={endsOn}
                min={startsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createPeriod.isPending}>
              {createPeriod.isPending ? "Creating…" : "Create period"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
