"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@workspace/ui/components/input";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2, Star, FileText } from "lucide-react";
import Image from "next/image";
import type { TopicOption, ClassOption } from "@/types/lesson-wizard";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { classesApi } from "@/entities/classes/api/endpoints";
import { useTopicsStore, useSlideUrl } from "@/entities/topics/model/store-enhanced";
import { useStages } from "@/entities/stages/model/store";

interface LessonWizardTopicProps {
  selectedTopic: TopicOption | null;
  selectedClasses: ClassOption[];
  onTopicChange: (topic: TopicOption | null) => void;
}

type TopicWithSlides = TopicOption & {
  slides?: Array<{
    id: string;
    kind: string;
    orderIndex: number;
    signedUrl?: string | null;
  }>;
};

function TopicThumbnail({ topic }: { topic: TopicWithSlides }) {
  const [hasError, setHasError] = useState(false);

  // Get first image slide
  const imageSlides = useMemo(() => {
    if (!topic.slides) return [];
    return topic.slides
      .filter((slide) => slide.kind === "image")
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [topic.slides]);

  const firstImageSlide = imageSlides[0];
  const slideId = firstImageSlide?.id;

  // Prefer signedUrl from API response, fall back to cached URL from store
  const cachedUrl = useSlideUrl(slideId);
  const imageUrl = firstImageSlide?.signedUrl || cachedUrl;

  if (hasError || !imageUrl) {
    return (
      <div className="w-full aspect-video rounded-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
        <Image
          src="/images/bp-small-logo.svg"
          alt="Bullyproof Logo"
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
      <Image
        src={imageUrl}
        alt={topic.title}
        fill
        className="object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function LessonWizardTopic({
  selectedTopic,
  selectedClasses,
  onTopicChange,
}: LessonWizardTopicProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendedTopicIds, setRecommendedTopicIds] = useState<Set<string>>(
    new Set()
  );
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  // Fetch all stages first (like the content page does)
  const { stages, isLoading: isLoadingStages, error: stagesError } = useStages();

  // Memoize stage IDs for stable queryKey
  const stageIds = useMemo(() => stages.map((s) => s.id), [stages]);
  const stageIdsString = useMemo(() => stageIds.join(","), [stageIds]);

  // Fetch topics for each stage in parallel (matching how stage detail page works)
  const {
    data: allTopicsData,
    isLoading: isLoadingTopics,
    error: topicsError,
  } = useQuery({
    queryKey: ["topics", "all-stages", "with-slides", "with-urls", stageIdsString],
    queryFn: async () => {
      if (!stages || stages.length === 0) return [];

      // Fetch topics for each stage in parallel (like the working content page)
      const topicsPromises = stages.map(async (stage) => {
        const result = await topicsApi.get.list({
          stageId: stage.id,
          includeSlides: true,
          includeUrls: true,
          limit: 100,
        });
        if (result.error) {
          console.warn(`Failed to fetch topics for stage ${stage.id}:`, result.error.message);
          return [];
        }
        return (result.data || []).map((topic: any) => ({
          ...topic,
          // Ensure stage info is included
          stageId: stage.id,
          stageCode: stage.code,
          stageName: stage.name,
          stageSortIndex: stage.sortIndex ?? 999999,
        }));
      });

      const topicsArrays = await Promise.all(topicsPromises);
      return topicsArrays.flat();
    },
    enabled: stages.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Transform topics data to TopicWithSlides format
  const topics: TopicWithSlides[] = useMemo(() => {
    if (!allTopicsData) return [];
    return allTopicsData.map((item: any) => ({
      id: item.id,
      title: item.title,
      stageCode: item.stageCode || item.stage_code || "",
      stageName: item.stageName || item.stage_name || "",
      stageId: item.stageId || item.stage_id || "",
      stageSortIndex: item.stageSortIndex ?? item.stage_sort_index ?? 999999,
      stageOrder: item.stageOrder ?? item.stage_order ?? null,
      slideCount: item.slideCount || item.slide_count || (item.slides?.length || 0),
      description: item.description || item.officialNotes || item.title,
      slides: item.slides || [],
    }));
  }, [allTopicsData]);

  const loading = isLoadingStages || isLoadingTopics;
  const error = stagesError ? (stagesError as Error).message : (topicsError ? (topicsError as Error).message : null);

  // Memoize selected class IDs for stable comparison
  const selectedClassIds = useMemo(
    () => selectedClasses.map((c) => c.id),
    [selectedClasses]
  );
  const selectedClassIdsString = useMemo(
    () => selectedClassIds.join(","),
    [selectedClassIds]
  );

  // Memoize topics IDs for stable comparison
  const topicsIds = useMemo(() => topics.map((t) => t.id), [topics]);
  const topicsIdsString = useMemo(() => topicsIds.join(","), [topicsIds]);

  // Use refs to access latest values without triggering re-renders
  const topicsRef = useRef(topics);
  const stagesRef = useRef(stages);
  const selectedClassesRef = useRef(selectedClasses);

  // Update refs when values change
  useEffect(() => {
    topicsRef.current = topics;
  }, [topics]);
  useEffect(() => {
    stagesRef.current = stages;
  }, [stages]);
  useEffect(() => {
    selectedClassesRef.current = selectedClasses;
  }, [selectedClasses]);

  // Calculate recommended topics
  useEffect(() => {
    // Early return if no classes or topics
    if (selectedClassesRef.current.length === 0 || topicsRef.current.length === 0) {
      setRecommendedTopicIds((prev) => {
        // Only update if actually changing
        if (prev.size === 0) return prev;
        return new Set();
      });
      return;
    }

    let cancelled = false;

    const calculateRecommended = async () => {
      setLoadingRecommended(true);
      try {
        const classIds = selectedClassesRef.current.map((c) => c.id);
        const recommendedTopics = new Set<string>();

        // Fetch completed lessons for selected classes
        const completedLessonsPromises = classIds.map((classId) =>
          lessonsApi.get.list({ classId, status: "completed", limit: 100 })
        );
        const completedLessonsResults = await Promise.all(completedLessonsPromises);

        if (cancelled) return;

        // Flatten and find most recent completed lesson
        const allCompletedLessons = completedLessonsResults
          .flatMap((result) => result.data || [])
          .filter((lesson) => lesson.topicId);

        if (allCompletedLessons.length > 0) {
          // Sort by createdAt descending to get most recent
          const mostRecentLesson = allCompletedLessons.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];

          const completedTopicId = mostRecentLesson.topicId;
          const completedTopic = topicsRef.current.find((t) => t.id === completedTopicId);

          if (completedTopic && completedTopic.stageId && completedTopic.stageOrder !== null) {
            // Find next sequential topic in same stage
            const stageTopics = topicsRef.current.filter(
              (t) => t.stageId === completedTopic.stageId
            );
            const sortedStageTopics = stageTopics.sort((a, b) => {
              const orderA = a.stageOrder ?? 999999;
              const orderB = b.stageOrder ?? 999999;
              return orderA - orderB;
            });

            const nextTopic = sortedStageTopics.find(
              (t) => (t.stageOrder ?? 999999) > (completedTopic.stageOrder ?? 0)
            );

            if (nextTopic) {
              recommendedTopics.add(nextTopic.id);
            }
          }
        } else {
          // Fallback: Match classes to curriculum stages by year codes
          // Get class details with yearCodes
          const classDetailsPromises = classIds.map((classId) =>
            classesApi.get.byId(classId)
          );
          const classDetailsResults = await Promise.all(classDetailsPromises);

          if (cancelled) return;

          // Collect all year codes from selected classes
          const yearCodesSet = new Set<string>();
          classDetailsResults.forEach((result) => {
            if (result.data) {
              const yearCodes = (result.data as any).yearCodes || [];
              if (Array.isArray(yearCodes)) {
                yearCodes.forEach((code: string) => yearCodesSet.add(code));
              }
            }
          });

          if (yearCodesSet.size > 0 && stagesRef.current.length > 0) {
            // Use stages from useStages() hook instead of fetching again
            // Find stages that match the year codes
            const matchingStages = stagesRef.current.filter((stage) => {
              if (!stage.years || stage.years.length === 0) return false;
              return stage.years.some((year) =>
                yearCodesSet.has(year.code)
              );
            });

            // Sort stages by sortIndex and get first matching stage
            const sortedMatchingStages = matchingStages.sort(
              (a, b) => (a.sortIndex ?? 999999) - (b.sortIndex ?? 999999)
            );

            if (sortedMatchingStages.length > 0) {
              const firstStage = sortedMatchingStages[0];
              // Find first topic (lowest stageOrder) from this stage
              const stageTopics = topicsRef.current.filter(
                (t) => t.stageId === firstStage.id
              );
              const sortedStageTopics = stageTopics.sort((a, b) => {
                const orderA = a.stageOrder ?? 999999;
                const orderB = b.stageOrder ?? 999999;
                return orderA - orderB;
              });

              if (sortedStageTopics.length > 0) {
                recommendedTopics.add(sortedStageTopics[0].id);
              }
            }
          }
        }

        if (cancelled) return;

        // Only update state if the Set contents actually changed
        setRecommendedTopicIds((prev) => {
          const prevArray = Array.from(prev).sort();
          const newArray = Array.from(recommendedTopics).sort();
          if (
            prevArray.length === newArray.length &&
            prevArray.every((id, i) => id === newArray[i])
          ) {
            return prev; // No change, return previous state
          }
          return recommendedTopics;
        });
      } catch (err) {
        console.error("Failed to calculate recommended topics:", err);
      } finally {
        if (!cancelled) {
          setLoadingRecommended(false);
        }
      }
    };

    calculateRecommended();

    return () => {
      cancelled = true;
    };
    // Only depend on stable string representations to avoid infinite loops
  }, [selectedClassIdsString, topicsIdsString]);

  const filteredTopics = topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.stageCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate recommended topics
  const recommendedTopics = filteredTopics.filter((topic) =>
    recommendedTopicIds.has(topic.id)
  );

  // Group remaining topics by stage
  const remainingTopics = filteredTopics.filter(
    (topic) => !recommendedTopicIds.has(topic.id)
  );

  const topicsByStage = remainingTopics.reduce(
    (acc, topic) => {
      const stageId = topic.stageId || "";
      const stageName = topic.stageName || "Unknown Stage";
      const stageSortIndex = topic.stageSortIndex ?? 999999;

      if (!acc[stageId]) {
        acc[stageId] = {
          stageId,
          stageName,
          stageCode: topic.stageCode,
          stageSortIndex,
          topics: [],
        };
      }

      acc[stageId].topics.push(topic);
      return acc;
    },
    {} as Record<
      string,
      {
        stageId: string;
        stageName: string;
        stageCode: string;
        stageSortIndex: number;
        topics: TopicWithSlides[];
      }
    >
  );

  // Sort stages by sortIndex, then sort topics within each stage by stageOrder
  const sortedStages = Object.values(topicsByStage)
    .sort((a, b) => a.stageSortIndex - b.stageSortIndex)
    .map((stage) => ({
      ...stage,
      topics: stage.topics.sort((a, b) => {
        const orderA = a.stageOrder ?? 999999;
        const orderB = b.stageOrder ?? 999999;
        return orderA - orderB;
      }),
    }));

  const renderTopicCard = (topic: TopicWithSlides, isRecommended = false) => {
    const isSelected = selectedTopic?.id === topic.id;

    return (
      <button
        key={topic.id}
        onClick={() => onTopicChange(topic)}
        className="text-left w-full"
      >
        <Card
          className={`
            h-full transition-all overflow-hidden
            ${
              isSelected
                ? "border-primary border-2 bg-primary/5"
                : isRecommended
                  ? "border-amber-400 border-2 bg-amber-50/50"
                  : "border-border hover:border-primary/50"
            }
          `}
        >
          <TopicThumbnail topic={topic} />
          {/* Footer with topic info - matches stage detail page */}
          <div
            className={`w-full text-xs font-medium px-3 py-1.5 flex items-center justify-between flex-shrink-0 ${
              isSelected
                ? "bg-[var(--brand-bullyproof-primary)] text-white"
                : "bg-muted text-primary"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {topic.stageOrder !== null && (
                <span
                  className={`font-bold text-xs flex-shrink-0 ${
                    isSelected ? "text-white/90" : "text-primary"
                  }`}
                >
                  {topic.stageOrder}
                </span>
              )}
              <span
                className={`font-medium capitalize truncate block ${
                  isSelected ? "text-white" : "text-primary"
                }`}
              >
                {topic.title}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isRecommended && (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white">
                  <Star className="h-3 w-3 fill-white" />
                </div>
              )}
              {isSelected && (
                <div className={`text-lg ${isSelected ? "text-white" : "text-primary"}`}>✓</div>
              )}
              <Badge
                variant="outline"
                className={`text-xs py-0 px-1.5 h-5 ${
                  isSelected ? "bg-white/20 text-white border-white/30" : ""
                }`}
              >
                {topic.slideCount} {topic.slideCount === 1 ? "slide" : "slides"}
              </Badge>
              {isRecommended && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-300 text-xs py-0 px-1.5 h-5"
                >
                  Recommended
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search input */}
      <Input
        placeholder="Search topics..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />

      {/* Topic cards grid */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="space-y-6 pr-4">
            {/* Recommended Section */}
            {recommendedTopics.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <h4 className="text-lg font-semibold">Recommended Lesson</h4>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                    {recommendedTopics.length}{" "}
                    {recommendedTopics.length === 1 ? "topic" : "topics"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {recommendedTopics.map((topic) =>
                    renderTopicCard(topic, true)
                  )}
                </div>
              </div>
            )}

            {/* Other Stages */}
            {sortedStages.length === 0 && recommendedTopics.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? `No topics found matching "${searchQuery}"`
                    : "No topics available"}
                </p>
              </div>
            ) : (
              sortedStages.map((stage) => (
                <div key={stage.stageId} className="space-y-3">
                  {/* Stage Header */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <h4 className="text-lg font-semibold">{stage.stageName}</h4>
                    <Badge variant="outline" className="text-xs">
                      {stage.topics.length}{" "}
                      {stage.topics.length === 1 ? "topic" : "topics"}
                    </Badge>
                  </div>

                  {/* Topics Grid for this Stage */}
                  <div className="grid grid-cols-2 gap-3">
                    {stage.topics.map((topic) => renderTopicCard(topic, false))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
