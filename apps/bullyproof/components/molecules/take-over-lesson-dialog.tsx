"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Loader2 } from "lucide-react";

type LessonForTakeOver = {
  id: string;
  assignedClasses?: Array<{ className: string }>;
  teacher?: { firstName?: string; lastName?: string; email?: string };
  createdByUserId?: string;
};

interface TakeOverLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: LessonForTakeOver;
  onConfirm: () => Promise<void>;
  isTakingOver?: boolean;
}

function getOwnerDisplayName(lesson: LessonForTakeOver): string {
  const t = lesson.teacher;
  if (t?.firstName && t?.lastName) return `${t.firstName} ${t.lastName}`;
  if (t?.email) return t.email;
  return "the lesson creator";
}

export function TakeOverLessonDialog({
  open,
  onOpenChange,
  lesson,
  onConfirm,
  isTakingOver = false,
}: TakeOverLessonDialogProps) {
  const ownerName = getOwnerDisplayName(lesson);
  const classNames =
    lesson.assignedClasses?.map((c) => c.className).join(", ") ?? "unknown classes";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Take Over Lesson</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This lesson was created for <strong>{classNames}</strong> by{" "}
                <strong>{ownerName}</strong>.
              </p>
              <p>
                You are about to take over this lesson. Please contact{" "}
                <strong>{ownerName}</strong> and ensure this is the desired
                outcome.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isTakingOver}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            disabled={isTakingOver}
          >
            {isTakingOver ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Taking over...
              </>
            ) : (
              "Take Over"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
