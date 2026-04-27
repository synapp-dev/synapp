"use client";

import { Star } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Badge } from "@workspace/ui/components/badge";
import type { StageLessonRatingRow } from "@/entities/ratings/api/endpoints";
import { cn } from "@workspace/ui/lib/utils";

type LessonRatingDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: StageLessonRatingRow | null;
};

function formatDateTime(dateValue: string): string {
  try {
    return new Date(dateValue).toLocaleString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

function teacherName(row: StageLessonRatingRow): string {
  const firstName = row.teacherFirstName?.trim() ?? "";
  const lastName = row.teacherLastName?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || row.teacherEmail || "Unknown teacher";
}

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-5 w-5",
            star <= value
              ? "fill-current text-amber-500"
              : "fill-none text-muted-foreground"
          )}
        />
      ))}
      <span className="ml-2 font-semibold">{value}/5</span>
    </div>
  );
}

export function LessonRatingDetailSheet({
  open,
  onOpenChange,
  row,
}: LessonRatingDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {row ? (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle>Lesson Rating Details</SheetTitle>
              <SheetDescription>
                View context for this teacher lesson rating.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Lesson</p>
              <h3 className="text-lg font-semibold">{row.topicTitle}</h3>
              {typeof row.topicStageOrder === "number" ? (
                <p className="text-sm text-muted-foreground">
                  Topic order: {row.topicStageOrder}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-md border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rating</p>
              <RatingStars value={row.rating} />
              {row.comments ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{row.comments}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No written comment provided.</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-md border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Teacher</span>
                <span className="text-sm font-medium">{teacherName(row)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">School</span>
                <span className="text-sm font-medium">{row.schoolName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Submitted</span>
                <span className="text-sm font-medium">
                  {formatDateTime(row.feedbackCreatedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Lesson Status</span>
                <Badge variant="outline" className="capitalize">
                  {row.lessonStatus.replaceAll("_", " ")}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned Classes</p>
              {row.classNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {row.classNames.map((className) => (
                    <Badge key={`${row.feedbackId}-${className}`} variant="secondary">
                      {className}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No classes were linked to this lesson.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
