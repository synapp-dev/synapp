import type { ReactNode } from "react";
import { Badge } from "@workspace/ui/components/badge";
import type { StageLessonRatingRow } from "@/entities/ratings/api/endpoints";

export type RatingsTableColumn = {
  key: string;
  label: string;
  className?: string;
  render: (row: StageLessonRatingRow) => ReactNode;
};

function formatTeacherName(row: StageLessonRatingRow): string {
  const firstName = row.teacherFirstName?.trim() ?? "";
  const lastName = row.teacherLastName?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || row.teacherEmail || "Unknown teacher";
}

function formatDate(dateValue: string): string {
  try {
    return new Date(dateValue).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

export const ratingsTableColumns: RatingsTableColumn[] = [
  {
    key: "topicTitle",
    label: "Lesson",
    className: "min-w-[220px]",
    render: (row) => (
      <div className="flex flex-col gap-1">
        <span className="font-medium">{row.topicTitle}</span>
        {typeof row.topicStageOrder === "number" ? (
          <span className="text-xs text-muted-foreground">
            Topic {row.topicStageOrder}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    key: "teacher",
    label: "Teacher",
    className: "min-w-[180px]",
    render: (row) => (
      <div className="flex flex-col gap-1">
        <span>{formatTeacherName(row)}</span>
        {row.teacherEmail ? (
          <span className="text-xs text-muted-foreground">{row.teacherEmail}</span>
        ) : null}
      </div>
    ),
  },
  {
    key: "school",
    label: "School",
    className: "min-w-[180px]",
    render: (row) => row.schoolName,
  },
  {
    key: "rating",
    label: "Rating",
    className: "w-[90px]",
    render: (row) => (
      <Badge variant="secondary" className="font-semibold">
        {row.rating}/5
      </Badge>
    ),
  },
  {
    key: "submitted",
    label: "Submitted",
    className: "w-[120px]",
    render: (row) => formatDate(row.feedbackCreatedAt),
  },
];
