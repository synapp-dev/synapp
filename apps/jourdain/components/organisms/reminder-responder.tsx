"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Clock, SkipForward } from "lucide-react";
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

/**
 * Opens a Done / +5 min / Skip card when a reminder notification is tapped.
 * The push deep-links to `?respond=<taskId>`; this reads that param from
 * wherever the user lands and overlays the card.
 */
export function ReminderResponder() {
  // Client-only: rendering nothing until mounted keeps this overlay out of the
  // initial hydration, so it can't shift Radix's auto-generated IDs (which would
  // break hydration for other components on the page).
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("respond");

  const { data: task, isLoading, error } = useReminderTask(
    mounted ? taskId : null
  );
  const respond = useRespondTask();

  useEffect(() => {
    setMounted(true);
  }, []);

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("respond");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function act(action: ReminderAction) {
    if (!taskId) return;
    respond.mutate({ taskId, action }, { onSuccess: close });
  }

  if (!mounted) return null;

  const open = taskId !== null;
  const resolved = task && task.status !== "open";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{task?.title ?? "Reminder"}</DialogTitle>
          {task?.notes ? (
            <DialogDescription>{task.notes}</DialogDescription>
          ) : null}
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : error || !task ? (
          <>
            <p className="text-sm text-muted-foreground">
              {error?.message ?? "This task no longer exists."}
            </p>
            <Button variant="outline" onClick={close}>
              Close
            </Button>
          </>
        ) : resolved ? (
          <>
            <p className="text-sm text-muted-foreground">
              Already marked {task.status}.
            </p>
            <Button variant="outline" onClick={close}>
              Close
            </Button>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              className="h-auto flex-col gap-1 py-3"
              onClick={() => act("done")}
              disabled={respond.isPending}
            >
              <Check className="h-4 w-4" />
              Done
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-1 py-3"
              onClick={() => act("delay")}
              disabled={respond.isPending}
            >
              <Clock className="h-4 w-4" />
              +5 min
            </Button>
            <Button
              variant="ghost"
              className="h-auto flex-col gap-1 py-3 text-muted-foreground"
              onClick={() => act("skip")}
              disabled={respond.isPending}
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </Button>
          </div>
        )}

        {respond.error ? (
          <p className="text-sm text-destructive">{respond.error.message}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
