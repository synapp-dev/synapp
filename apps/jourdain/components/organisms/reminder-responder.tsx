"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Check, Clock, GlassWater, SkipForward } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Spinner } from "@workspace/ui/components/spinner";
import {
  useReminderTask,
  useRespondTask,
  type ReminderAction,
} from "@/hooks/reminders/use-reminder";
import { useAckPing, usePingRoutine } from "@/hooks/routines/use-routines";

/**
 * Opens when a reminder notification is tapped. Two modes:
 *  - `?respond=<taskId>` → a one-off task: Done / +5 min / Skip
 *  - `?ping=<routineId>` → a recurring ping (e.g. water): Got it / Dismiss
 * Client-only so it stays out of hydration (it must not shift Radix IDs).
 */
export function ReminderResponder() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("respond");
  const pingId = searchParams.get("ping");
  const isPing = pingId !== null;

  const taskQuery = useReminderTask(mounted && !isPing ? taskId : null);
  const pingQuery = usePingRoutine(mounted && isPing ? pingId : null);
  const respond = useRespondTask();
  const ackPing = useAckPing();

  useEffect(() => {
    setMounted(true);
  }, []);

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("respond");
    params.delete("ping");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function actTask(action: ReminderAction) {
    if (!taskId) return;
    // Dismiss instantly; the mutation runs optimistically in the background.
    close();
    respond.mutate({ taskId, action });
  }

  function actPing() {
    if (!pingId) return;
    close();
    ackPing.mutate(pingId);
  }

  if (!mounted) return null;

  const open = taskId !== null || pingId !== null;
  const data = isPing ? pingQuery.data : taskQuery.data;
  const isLoading = isPing ? pingQuery.isLoading : taskQuery.isLoading;
  const loadError = isPing ? pingQuery.error : taskQuery.error;
  const pending = respond.isPending || ackPing.isPending;
  const actionError = respond.error ?? ackPing.error;
  const taskResolved =
    !isPing && taskQuery.data && taskQuery.data.status !== "open";
  const nextFire =
    isPing && pingQuery.data?.nextFireAt
      ? format(parseISO(pingQuery.data.nextFireAt), "h:mm a")
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{data?.title ?? "Reminder"}</DialogTitle>
          {isPing && nextFire ? (
            <DialogDescription>Next reminder at {nextFire}</DialogDescription>
          ) : !isPing && data?.notes ? (
            <DialogDescription>{data.notes}</DialogDescription>
          ) : null}
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : loadError || !data ? (
          <>
            <p className="text-sm text-muted-foreground">
              {loadError?.message ?? "This reminder no longer exists."}
            </p>
            <Button variant="outline" onClick={close}>
              Close
            </Button>
          </>
        ) : isPing ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              className="h-auto flex-col gap-1 py-3"
              onClick={actPing}
              disabled={pending}
            >
              <GlassWater className="h-4 w-4" />
              Got it
            </Button>
            <Button
              variant="ghost"
              className="h-auto flex-col gap-1 py-3 text-muted-foreground"
              onClick={close}
              disabled={pending}
            >
              <Clock className="h-4 w-4" />
              Dismiss
            </Button>
          </div>
        ) : taskResolved ? (
          <>
            <p className="text-sm text-muted-foreground">
              Already marked {taskQuery.data?.status}.
            </p>
            <Button variant="outline" onClick={close}>
              Close
            </Button>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              className="h-auto flex-col gap-1 py-3"
              onClick={() => actTask("done")}
              disabled={pending}
            >
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-1 py-3"
              onClick={() => actTask("delay")}
              disabled={pending}
            >
              <Clock className="h-4 w-4" />
              +5 min
            </Button>
            <Button
              variant="ghost"
              className="h-auto flex-col gap-1 py-3 text-muted-foreground"
              onClick={() => actTask("skip")}
              disabled={pending}
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </Button>
          </div>
        )}

        {actionError ? (
          <p className="text-sm text-destructive">{actionError.message}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
