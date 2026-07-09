"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@workspace/ui/components/input";
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Star, AlertTriangle, BookOpen, ChevronLeft } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Image from "next/image";
import type { TopicOption, ClassOption } from "@/types/lesson-wizard";
import { compareSlidesByPosition } from "@/lib/fractional-position";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { classesApi } from "@/entities/classes/api/endpoints";
import { toStorageUrl } from "@/utils/supabase/storage-url";
import { useStages } from "@/entities/stages/model/store";
import { Alert, AlertTitle, AlertDescription } from "@workspace/ui/components/alert";
import { getMinYearCodeSortIndex } from "@/lib/year-code-sort";

interface LessonWizardTopicProps {
  selectedTopic: TopicOption | null;
  selectedClasses: ClassOption[];
  onTopicChange: (topic: TopicOption | null) => void;
  preSelectTopicId?: string | null;
  recommendedStageId?: string | null;
}

type TopicWithSlides = TopicOption & {
  stageId?: string;
  stageOrder?: number | null;
  stageSortIndex?: number;
  slides?: Array<{
    id: string;
    kind: string;
    position: string;
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
      .sort(compareSlidesByPosition);
  }, [topic.slides]);

  const firstImageSlide = imageSlides[0];

  // Use signedUrl from API response (DB-cached)
  const imageUrl = firstImageSlide?.signedUrl || null;

  if (hasError || !imageUrl) {
    return (
      <div className="w-full aspect-video rounded-t-md bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
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
    <div className="relative w-full aspect-video rounded-t-md overflow-hidden bg-muted">
      <Image
        src={toStorageUrl(imageUrl) ?? imageUrl}
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
  recommendedStageId,
}: LessonWizardTopicProps) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendedTopicIds] = useState<Set<string>>(
    new Set()
  );
  const [loadingRecommended] = useState(false);
  const [classProgressWarning] = useState<{
    show: boolean;
    classes: Array<{ classId: string; className: string; topicTitle: string; stageName: string }>;
  } | null>(null);

  // Fetch all stages first (like the content page does)
  const {
    stages,
    isLoading: isLoadingStages,
    error: stagesError,
  } = useStages();

  // Fetch classes with yearCodes for recommended stage calculation
  const selectedClassIds = useMemo(() => selectedClasses.map((c) => c.id), [selectedClasses]);
  const { data: classesWithYearCodes } = useQuery({
    queryKey: ["classes", "with-year-codes", selectedClassIds.join(",")],
    queryFn: async () => {
      if (selectedClassIds.length === 0) return [];
      
      // Fetch classes by IDs - we'll need to get them from the school
      // For now, fetch all classes from the first class's school
      if (selectedClasses.length === 0) return [];
      
      const schoolId = selectedClasses[0].schoolId;
      const result = await classesApi.get.list({ schoolId, active: true });
      if (result.error) {
        console.error("Failed to fetch classes:", result.error);
        return [];
      }
      
      // Filter to only selected classes
      return (result.data || []).filter((c: any) => selectedClassIds.includes(c.id));
    },
    enabled: selectedClassIds.length > 0 && !recommendedStageId,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate recommended stage ID
  const calculatedRecommendedStageId = useMemo(() => {
    // If recommendedStageId prop is provided, use it
    if (recommendedStageId) {
      return recommendedStageId;
    }

    // Otherwise, calculate from selected classes' year levels
    if (selectedClasses.length === 0 || !stages || stages.length === 0) {
      return null;
    }

    // If we have classes with yearCodes, match them to stages
    if (classesWithYearCodes && classesWithYearCodes.length > 0) {
      // Collect all year codes from selected classes
      const allYearCodes = new Set<string>();
      classesWithYearCodes.forEach((cls: any) => {
        if (cls.yearCodes && Array.isArray(cls.yearCodes)) {
          cls.yearCodes.forEach((code: string) => {
            if (code) allYearCodes.add(code);
          });
        }
      });

      if (allYearCodes.size > 0) {
        // Find stages that match the year codes
        const matchingStages = stages.filter((stage) => {
          if (!stage.years || !Array.isArray(stage.years)) return false;
          return stage.years.some((year) => year.code && allYearCodes.has(year.code));
        });

        // Sort by sortIndex and return the first matching stage
        const sortedMatchingStages = matchingStages.sort(
          (a, b) => (a.sortIndex ?? 999999) - (b.sortIndex ?? 999999)
        );

        if (sortedMatchingStages.length > 0) {
          return sortedMatchingStages[0].id;
        }
      }
    }

    // Fallback: use the first stage sorted by sortIndex
    const sortedStages = [...stages].sort((a, b) => (a.sortIndex ?? 999999) - (b.sortIndex ?? 999999));
    return sortedStages[0]?.id || null;
  }, [recommendedStageId, selectedClasses, stages, classesWithYearCodes]);

  const effectiveRecommendedStageId = calculatedRecommendedStageId;

  // Memoize stage IDs for stable queryKey
  const stageIds = useMemo(() => stages.map((s) => s.id), [stages]);
  const stageIdsString = useMemo(() => stageIds.join(","), [stageIds]);

  // Fetch topics for each stage in parallel (matching how stage detail page works)
  const {
    data: allTopicsData,
    isLoading: isLoadingTopics,
    error: topicsError,
  } = useQuery({
    queryKey: [
      "topics",
      "all-stages",
      "with-slides",
      "with-urls",
      stageIdsString,
    ],
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
          console.warn(
            `Failed to fetch topics for stage ${stage.id}:`,
            result.error.message
          );
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
      slideCount:
        item.slideCount || item.slide_count || item.slides?.length || 0,
      description: item.description || item.officialNotes || item.title,
      slides: item.slides || [],
    }));
  }, [allTopicsData]);

  const loading = isLoadingStages || isLoadingTopics;
  const error = stagesError
    ? (stagesError as Error).message
    : topicsError
      ? (topicsError as Error).message
      : null;


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

  // Recommendations are now handled in the parent wizard component
  // This component no longer fetches recommendations

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

  const sortStagesByYear = (
    a: { stageId: string; stageSortIndex: number },
    b: { stageId: string; stageSortIndex: number }
  ) => {
    const stageA = stages.find((s) => s.id === a.stageId);
    const stageB = stages.find((s) => s.id === b.stageId);
    const aCodes = (stageA?.years ?? [])
      .map((y) => y.code)
      .filter((c): c is string => !!c);
    const bCodes = (stageB?.years ?? [])
      .map((y) => y.code)
      .filter((c): c is string => !!c);
    const aMin = getMinYearCodeSortIndex(aCodes);
    const bMin = getMinYearCodeSortIndex(bCodes);
    if (aMin !== bMin) return aMin - bMin;
    return a.stageSortIndex - b.stageSortIndex;
  };

  // Sort stages by year level (½ → 12), then topics within each stage by stageOrder
  const _sortedStages = Object.values(topicsByStage)
    .sort(sortStagesByYear)
    .map((stage) => ({
      ...stage,
      topics: stage.topics.sort((a, b) => {
        const orderA = a.stageOrder ?? 999999;
        const orderB = b.stageOrder ?? 999999;
        return orderA - orderB;
      }),
    }));

  // Get topics for selected stage
  const selectedStageTopics = useMemo(() => {
    if (!selectedStageId) return [];
    return filteredTopics.filter((topic) => topic.stageId === selectedStageId);
  }, [selectedStageId, filteredTopics]);

  // Get stage data for selected stage
  const selectedStage = useMemo(() => {
    if (!selectedStageId) return null;
    return stages.find((s) => s.id === selectedStageId);
  }, [selectedStageId, stages]);

  // Calculate topic counts for each stage
  const stagesWithTopicCounts = useMemo(() => {
    if (!stages || stages.length === 0) return [];
    
    return stages.map((stage) => {
      const stageTopics = topics.filter((topic) => topic.stageId === stage.id);
      return {
        ...stage,
        topicCount: stageTopics.length,
      };
    }).sort((a, b) => {
      const aCodes = (a.years ?? [])
        .map((y) => y.code)
        .filter((c): c is string => !!c);
      const bCodes = (b.years ?? [])
        .map((y) => y.code)
        .filter((c): c is string => !!c);
      const aMin = getMinYearCodeSortIndex(aCodes);
      const bMin = getMinYearCodeSortIndex(bCodes);
      if (aMin !== bMin) return aMin - bMin;
      return (a.sortIndex ?? 999999) - (b.sortIndex ?? 999999);
    });
  }, [stages, topics]);

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
            h-full transition-all overflow-hidden p-0 gap-0
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
                <div
                  className={`text-sm ${isSelected ? "text-white" : "text-primary"}`}
                >
                  ✓
                </div>
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

  // Stage Selection View
  if (!selectedStageId) {
    return (
      <div className="flex flex-col gap-4 h-full min-h-0">
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="space-y-4 pr-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-border">
                  <CardHeader className="py-0">
                    <div className="space-y-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-5 w-5 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="flex items-center gap-x-2 mt-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {stagesWithTopicCounts.map((stage) => {
                const isRecommended = stage.id === effectiveRecommendedStageId;
                return (
                  <Card
                    key={stage.id}
                    className={`relative transition-shadow cursor-pointer hover:shadow-md ${
                      isRecommended
                        ? "border-amber-400 border-2 bg-amber-50/50"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedStageId(stage.id)}
                  >
                    <CardHeader className="py-0">
                      <div className="space-y-0">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                            <span>{stage.name}</span>
                            {isRecommended && (
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white flex-shrink-0">
                                <Star className="h-3 w-3 fill-white" />
                              </div>
                            )}
                          </CardTitle>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {stage.topicCount} {stage.topicCount === 1 ? "lesson" : "lessons"}
                          </span>
                        </div>
                        {stage.years && stage.years.length > 0 && (
                          <div className="flex items-center gap-x-2 text-xs text-muted-foreground">
                            {stage.years
                              .flatMap((year, index) => [
                                index > 0 && (
                                  <span key={`dot-${year.id}`} className="opacity-50">
                                    •
                                  </span>
                                ),
                                <span key={year.id}>{year.displayName}</span>,
                              ])
                              .filter(Boolean)}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Topic Selection View
  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Back button and stage header */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedStageId(null)}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Stages
        </Button>
        {selectedStage && (
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{selectedStage.name}</h3>
            <Badge variant="outline" className="text-xs">
              {selectedStageTopics.length}{" "}
              {selectedStageTopics.length === 1 ? "lesson" : "lessons"}
            </Badge>
          </div>
        )}
      </div>

      {/* Search input */}
      <Input
        placeholder="Search lessons..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full flex-shrink-0"
      />

      {/* Topic cards grid */}
      <ScrollArea className="flex-1 min-h-0">
        {loading || loadingRecommended ? (
          <div className="space-y-6 pr-4">
            {/* Skeleton for recommended section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="h-full transition-all overflow-hidden p-0 gap-0">
                    <Skeleton className="w-full aspect-video rounded-t-md" />
                    <div className="w-full text-xs font-medium px-3 py-1.5 flex items-center justify-between flex-shrink-0 bg-muted">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Skeleton className="h-4 w-4 rounded-sm" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            {/* Skeleton for topics grid */}
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-full transition-all overflow-hidden p-0 gap-0">
                  <Skeleton className="w-full aspect-video rounded-t-md" />
                  <div className="w-full text-xs font-medium px-3 py-1.5 flex items-center justify-between flex-shrink-0 bg-muted">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Skeleton className="h-4 w-4 rounded-sm" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="space-y-6 pr-4">
            {/* Warning Section - Classes on Different Topics */}
            {classProgressWarning?.show && (
              <Alert className="bg-yellow-50 border-yellow-300 text-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-900">
                  Classes are on different lessons
                </AlertTitle>
                <AlertDescription className="text-yellow-800 mt-2">
                  <div className="space-y-1">
                    {classProgressWarning.classes.map((classInfo) => (
                      <div key={classInfo.classId} className="text-sm">
                        <span className="font-medium">{classInfo.className}</span>
                        {" is on "}
                        <span className="font-medium">{classInfo.topicTitle}</span>
                        {" ("}
                        <span className="font-medium">{classInfo.stageName}</span>
                        {")"}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Recommended Section */}
            {recommendedTopics.filter((t) => t.stageId === selectedStageId).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <h4 className="text-lg font-semibold">Recommended Lesson</h4>
                  <Badge
                    variant="outline"
                    className="text-xs bg-amber-50 text-amber-700 border-amber-300"
                  >
                    {recommendedTopics.filter((t) => t.stageId === selectedStageId).length}{" "}
                    {recommendedTopics.filter((t) => t.stageId === selectedStageId).length === 1 ? "lesson" : "lessons"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {recommendedTopics
                    .filter((t) => t.stageId === selectedStageId)
                    .map((topic) => renderTopicCard(topic, true))}
                </div>
              </div>
            )}

            {/* Topics Grid */}
            {selectedStageTopics.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? `No lessons found matching "${searchQuery}"`
                    : "No lessons available"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {selectedStageTopics
                  .filter((topic) => !recommendedTopicIds.has(topic.id))
                  .map((topic) => renderTopicCard(topic, false))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
