"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiveLessonStore } from "@/stores/live-lesson-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { TvMinimalPlay, Clock, Users } from "lucide-react";

export function LiveLessonPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const isLive = useLiveLessonStore((s) => s.isLive);
  const liveUrl = useLiveLessonStore((s) => s.getUrl());
  const title = useLiveLessonStore((s) => s.title);
  const classCount = useLiveLessonStore((s) => s.classCount);
  const startedAt = useLiveLessonStore((s) => s.startedAt);

  const [open, setOpen] = React.useState(false);
  const hasPromptedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isLive || !liveUrl) return;
    const onLiveLessonPath = pathname === liveUrl || pathname.startsWith(liveUrl + "/");
    if (onLiveLessonPath) return;
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;
    setOpen(true);
  }, [isLive, liveUrl, pathname]);

  const goToLesson = () => {
    if (liveUrl) router.push(liveUrl);
    setOpen(false);
  };

  const dismiss = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-md bg-orange-500/10 p-2 text-orange-600">
              <TvMinimalPlay className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle>Live lesson in progress</DialogTitle>
              <DialogDescription>
                You currently have a live lesson in progress. Would you like to go there now?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* <div className="mt-2 rounded-md border bg-muted/30 p-3">
          <div className="font-medium text-sm">{title || "Lesson"}</div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {typeof classCount === "number" && (
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {classCount} {classCount === 1 ? "class" : "classes"}</span>
            )}
            {startedAt && (
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(startedAt).toLocaleString()}</span>
            )}
          </div>
        </div> */}

        <DialogFooter>
          <Button variant="outline" onClick={dismiss}>Dismiss</Button>
          <Button onClick={goToLesson} className="bg-orange-600 hover:bg-orange-700">
            Go to live lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


