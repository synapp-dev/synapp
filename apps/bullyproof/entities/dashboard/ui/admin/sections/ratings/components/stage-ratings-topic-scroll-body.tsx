"use client";

import { Star, MessageSquare, Calendar } from "lucide-react";
import ReactTimeago from "react-timeago";
import { Separator } from "@workspace/ui/components/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { StageLessonRatingRow } from "@/entities/ratings/api/endpoints";
import { cn } from "@workspace/ui/lib/utils";
import { teacherDisplayName } from "../stage-ratings-filter";

function StarDisplay({
  rating,
  size = "h-5 w-5",
}: {
  rating: number;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size,
            star <= rating
              ? "fill-current text-amber-500"
              : "fill-none text-muted-foreground"
          )}
        />
      ))}
      <span className="ml-2 text-sm font-medium">{rating}/5</span>
    </div>
  );
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

type StageRatingsTopicScrollBodyProps = {
  unfilteredRows: StageLessonRatingRow[];
  filteredRows: StageLessonRatingRow[];
  filtersActive: boolean;
  onRowClick: (row: StageLessonRatingRow) => void;
};

export function StageRatingsTopicScrollBody({
  unfilteredRows,
  filteredRows,
  filtersActive,
  onRowClick,
}: StageRatingsTopicScrollBodyProps) {
  const totalCount = unfilteredRows.length;
  const shownCount = filteredRows.length;

  const averageRating =
    filteredRows.length > 0
      ? filteredRows.reduce((sum, r) => sum + r.rating, 0) / filteredRows.length
      : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: filteredRows.filter((r) => r.rating === star).length,
    percentage:
      filteredRows.length > 0
        ? (filteredRows.filter((r) => r.rating === star).length /
            filteredRows.length) *
          100
        : 0,
  }));

  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No ratings yet for this lesson.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-4xl font-bold">
                {filteredRows.length > 0 ? averageRating.toFixed(1) : "—"}
              </div>
              {filteredRows.length > 0 ? (
                <StarDisplay rating={Math.round(averageRating)} />
              ) : (
                <span className="text-sm text-muted-foreground">
                  No matching ratings
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Based on {shownCount} {shownCount === 1 ? "rating" : "ratings"}
              {filtersActive && totalCount !== shownCount
                ? ` (of ${totalCount} total)`
                : null}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ratingDistribution.map(({ star, count, percentage }) => (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex w-20 items-center gap-1">
                    <span className="text-sm font-medium">{star}</span>
                    <Star className="h-3 w-3 fill-current text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-sm text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {shownCount === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No ratings match your search or school filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredRows.map((row) => (
            <Card
              key={row.feedbackId}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => onRowClick(row)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="text-xl">
                      <span className="font-normal">
                        {teacherDisplayName(row)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {row.schoolName}
                      </Badge>
                      {row.classNames?.map((name) => (
                        <Badge
                          key={name}
                          variant="secondary"
                          className="text-xs"
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="flex-shrink-0 cursor-help text-xs"
                      >
                        <Calendar className="mr-1 h-3 w-3" />
                        <ReactTimeago date={row.feedbackCreatedAt} />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{formatDate(row.feedbackCreatedAt)}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <StarDisplay rating={row.rating} size="h-8 w-8" />
                  {row.comments ? (
                    <div className="flex items-start gap-2 border-t pt-4">
                      <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <p className="flex-1 text-sm text-muted-foreground">
                        {row.comments}
                      </p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
