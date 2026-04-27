"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Search, Star } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ratingsApi,
  type StageLessonRatingRow,
  type StageRatingsResponse,
} from "@/entities/ratings/api/endpoints";
import { useTopicsByStage } from "@/entities/topics/model/store-enhanced";
import { LessonRatingDetailSheet } from "./components/lesson-rating-detail-sheet";
import { StageRatingsTopicScrollBody } from "./components/stage-ratings-topic-scroll-body";
import {
  ALL_SCHOOLS,
  buildSchoolOptions,
  filterTopicRows,
} from "./stage-ratings-filter";
import { usePageTitle } from "@/hooks/use-page-title";
import { cn } from "@workspace/ui/lib/utils";

type StageTopicNavItem = {
  id: string;
  title: string;
  stageOrder: number | null;
  ratingCount: number;
};

type StageRatingsSectionProps = {
  stageSlug: string;
};

function buildTopicNavItems(
  data: StageRatingsResponse,
  apiTopics: { id: string; title: string; stageOrder: number | null }[]
): StageTopicNavItem[] {
  const rows = data.rows;
  const countBy = new Map<string, number>();
  rows.forEach((r) => {
    countBy.set(r.topicId, (countBy.get(r.topicId) ?? 0) + 1);
  });

  if (apiTopics.length > 0) {
    const seen = new Set<string>();
    const list: StageTopicNavItem[] = apiTopics.map((t) => {
      seen.add(t.id);
      return {
        id: t.id,
        title: t.title,
        stageOrder: t.stageOrder,
        ratingCount: countBy.get(t.id) ?? 0,
      };
    });
    for (const r of rows) {
      if (seen.has(r.topicId)) continue;
      seen.add(r.topicId);
      list.push({
        id: r.topicId,
        title: r.topicTitle,
        stageOrder: r.topicStageOrder,
        ratingCount: countBy.get(r.topicId) ?? 0,
      });
    }
    return list.sort((a, b) => {
      const ao = a.stageOrder ?? 999999;
      const bo = b.stageOrder ?? 999999;
      return ao - bo;
    });
  }

  const m = new Map<string, StageTopicNavItem>();
  for (const r of rows) {
    if (!m.has(r.topicId)) {
      m.set(r.topicId, {
        id: r.topicId,
        title: r.topicTitle,
        stageOrder: r.topicStageOrder,
        ratingCount: countBy.get(r.topicId) ?? 0,
      });
    }
  }
  return [...m.values()].sort((a, b) => {
    const ao = a.stageOrder ?? 999999;
    const bo = b.stageOrder ?? 999999;
    return ao - bo;
  });
}

function StageAverageHeaderSummary({ rows }: { rows: StageLessonRatingRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
        <span className="text-lg font-semibold tabular-nums md:text-xl">—</span>
        <span className="text-xs md:text-sm">No stage average yet</span>
      </div>
    );
  }
  const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
  const rounded = Math.min(5, Math.max(1, Math.round(avg)));
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 md:gap-3">
      <div className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(
              "h-4 w-4 md:h-5 md:w-5",
              s <= rounded
                ? "fill-amber-500 text-amber-500"
                : "fill-none text-muted-foreground/35"
            )}
          />
        ))}
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none md:text-3xl">
        {avg.toFixed(1)}
        <span className="ml-1 text-sm font-semibold text-muted-foreground md:text-base">
          / 5
        </span>
      </p>
    </div>
  );
}

export function StageRatingsSection({ stageSlug }: StageRatingsSectionProps) {
  usePageTitle(["admin", "ratings", stageSlug]);

  const [data, setData] = useState<StageRatingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<StageLessonRatingRow | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<string>(ALL_SCHOOLS);

  const { topics: apiTopics } = useTopicsByStage(data?.stage.id ?? null, {
    includeSlides: false,
    includeUrls: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchStageRatings() {
      setIsLoading(true);
      setError(null);

      const result = await ratingsApi.get.stageRatings(stageSlug);
      if (!isMounted) return;

      if (result.error) {
        setData(null);
        setError(result.error.message ?? "Failed to load stage ratings");
      } else {
        setData(result.data);
      }
      setIsLoading(false);
    }

    fetchStageRatings();
    return () => {
      isMounted = false;
    };
  }, [stageSlug]);

  const topicNavItems = useMemo(() => {
    if (!data) return [];
    return buildTopicNavItems(data, apiTopics);
  }, [data, apiTopics]);

  useEffect(() => {
    if (topicNavItems.length === 0) {
      setSelectedTopicId(null);
      return;
    }
    setSelectedTopicId((prev) => {
      if (prev && topicNavItems.some((t) => t.id === prev)) return prev;
      return topicNavItems[0].id;
    });
  }, [topicNavItems]);

  useEffect(() => {
    setSearchQuery("");
    setSchoolFilter(ALL_SCHOOLS);
  }, [selectedTopicId]);

  const topicRows = useMemo(() => {
    if (!data || !selectedTopicId) return [];
    return data.rows.filter((r) => r.topicId === selectedTopicId);
  }, [data, selectedTopicId]);

  const filteredRows = useMemo(
    () => filterTopicRows(topicRows, schoolFilter, searchQuery),
    [topicRows, schoolFilter, searchQuery]
  );

  const schoolOptions = useMemo(
    () => buildSchoolOptions(topicRows),
    [topicRows]
  );

  const lessonIndex = useMemo(
    () => topicNavItems.findIndex((t) => t.id === selectedTopicId),
    [topicNavItems, selectedTopicId]
  );

  const currentTopic =
    lessonIndex >= 0 ? topicNavItems[lessonIndex] : null;

  const goPrevLesson = useCallback(() => {
    if (lessonIndex <= 0) return;
    setSelectedTopicId(topicNavItems[lessonIndex - 1].id);
  }, [lessonIndex, topicNavItems]);

  const goNextLesson = useCallback(() => {
    if (lessonIndex < 0 || lessonIndex >= topicNavItems.length - 1) return;
    setSelectedTopicId(topicNavItems[lessonIndex + 1].id);
  }, [lessonIndex, topicNavItems]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrevLesson();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNextLesson();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrevLesson, goNextLesson]);

  const filtersActive =
    searchQuery.trim().length > 0 || schoolFilter !== ALL_SCHOOLS;
  const shownCount = filteredRows.length;
  const topicTotal = topicRows.length;

  const handleRowClick = (row: StageLessonRatingRow) => {
    setSelectedRow(row);
    setIsDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/ratings">Back to stages</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const orderLabel =
    currentTopic?.stageOrder != null
      ? `Lesson ${currentTopic.stageOrder}`
      : lessonIndex >= 0
        ? `Lesson ${lessonIndex + 1}`
        : "Lesson";

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {topicNavItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {data.rows.length === 0
                ? "No lesson ratings have been submitted for this stage yet, and no curriculum lessons were found to display."
                : "No curriculum lessons were found for this stage. Ratings exist but could not be matched to lesson metadata."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
            <h2 className="min-w-0 text-xl font-bold tracking-tight md:text-2xl">
              {data.stage.name}
            </h2>
            <StageAverageHeaderSummary rows={data.rows} />
          </div>
          <p className="text-sm text-muted-foreground">
            {data.rows.length === 1
              ? "1 rating in this stage."
              : `${data.rows.length} ratings in this stage.`}
          </p>

          <div className="flex max-h-[calc(100dvh-12rem)] min-h-[min(520px,calc(100dvh-12rem))] flex-col overflow-hidden rounded-lg border bg-card">
            <div className="shrink-0 space-y-3 border-b bg-background px-4 py-3 md:px-5">
              <div className="flex items-stretch gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={lessonIndex <= 0}
                  onClick={goPrevLesson}
                  aria-label="Previous lesson"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex min-w-0 flex-1 flex-col justify-center rounded-md border bg-muted/40 px-3 py-2 text-center sm:px-4">
                  <p className="text-xs text-muted-foreground">
                    {orderLabel}
                    {topicNavItems.length > 0
                      ? ` · ${lessonIndex + 1} of ${topicNavItems.length}`
                      : null}
                  </p>
                  <p className="truncate text-sm font-medium leading-snug sm:text-base">
                    {currentTopic?.title ?? "Select a lesson"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={
                    lessonIndex < 0 ||
                    lessonIndex >= topicNavItems.length - 1
                  }
                  onClick={goNextLesson}
                  aria-label="Next lesson"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative min-w-0 flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search teacher, school, class, comment…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label="Search ratings"
                  />
                </div>
                <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="School" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SCHOOLS}>All schools</SelectItem>
                    {schoolOptions.map(({ id, name }) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  All ratings (
                  {shownCount}
                  {filtersActive && shownCount !== topicTotal
                    ? ` of ${topicTotal}`
                    : ""}
                  )
                </h3>
              </div>
            </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
            {selectedTopicId ? (
              <StageRatingsTopicScrollBody
                unfilteredRows={topicRows}
                filteredRows={filteredRows}
                filtersActive={filtersActive}
                onRowClick={handleRowClick}
              />
            ) : null}
          </div>
        </div>
        </>
      )}

      <LessonRatingDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        row={selectedRow}
      />
    </div>
  );
}
