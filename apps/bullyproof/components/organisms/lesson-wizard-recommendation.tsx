"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertTitle, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
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
import { AlertTriangle, CheckCircle2, Info, Star, ChevronsRight, ChevronsUp, ChevronsDown, ChevronDown } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Separator } from "@workspace/ui/components/separator";
import Image from "next/image";
import type { ClassOption } from "@/types/lesson-wizard";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { useSlideUrl } from "@/entities/topics/model/store-enhanced";
import { toStorageUrl } from "@/utils/supabase/storage-url";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { useStages } from "@/entities/stages/model/store";
import { useMeStore } from "@/entities/me/model/store";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { useRouter } from "next/navigation";

interface RecommendationData {
  recommendedTopicId: string | null;
  recommendedTopic: {
    id: string;
    title: string;
    stageId: string;
    stageName: string;
    stageOrder: number | null;
  } | null;
  warning: {
    show: boolean;
    classes: Array<{
      classId: string;
      className: string;
      topicTitle: string;
      stageName: string;
    }>;
    multipleStages?: Array<{
      stageId: string;
      stageName: string;
      stageCode: string;
      stageSortIndex: number;
      classes: Array<{
        classId: string;
        className: string;
        yearCodes: string[];
      }>;
      firstTopic: {
        id: string;
        title: string;
        stageOrder: number | null;
      } | null;
    }>;
  } | null;
  reason: "next_topic" | "fallback_year_match" | "final_fallback" | null;
  completedLessonInfo: {
    lessonTitle: string;
    topicTitle: string;
    completedAt: string;
  } | null;
  activeLessons: Array<{
    lessonId: string;
    title: string;
    status: "preparing" | "ready" | "in_progress" | "feedback";
    topicId: string;
    topicTitle: string;
    classIds: string[];
    className: string;
    schoolId: string;
    schoolSlug: string | null;
    createdByUserId: string;
    ownerName: string | null;
    ownerEmail: string | null;
  }>;
}

interface LessonWizardRecommendationProps {
  recommendationData: RecommendationData | null;
  isLoading: boolean;
  selectedClasses: ClassOption[];
  schoolSlug: string;
  onProceedWithRecommendation: () => void;
  onChooseDifferentLesson: () => void;
  onGoToLiveLesson: (lessonId: string) => void;
  onBack: () => void;
  onSelectStage?: (stageId: string) => void;
  onAddClassesToLesson?: (lessonId: string, classIds: string[]) => Promise<void>;
  onCancelLessons?: (lessonIds: string[]) => Promise<void>;
  onCombineLessons?: (lessonIds: string[], allClassIds: string[]) => Promise<void>;
}

type TopicWithSlides = {
  id: string;
  title: string;
  stageId?: string;
  stageOrder?: number | null;
  stageSortIndex?: number;
  slides?: Array<{
    id: string;
    kind: string;
    orderIndex: number;
    signedUrl?: string | null;
  }>;
  slideCount?: number;
};

function TopicThumbnail({ topic, horizontal = false }: { topic: TopicWithSlides; horizontal?: boolean }) {
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
      <div className={`${horizontal ? 'h-full w-auto flex-shrink-0 aspect-video' : 'w-full aspect-video'} ${horizontal ? 'rounded-l-md' : 'rounded-t-md'} bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center`}>
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
    <div className={`relative ${horizontal ? 'h-full w-auto flex-shrink-0 aspect-video' : 'w-full aspect-video'} ${horizontal ? 'rounded-l-md' : 'rounded-t-md'} overflow-hidden bg-muted`}>
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

// Topic Progress Component for Class Progress section
function TopicProgressList({
  className,
  stageId,
  recommendedTopicId,
  completedTopicIds,
}: {
  className?: string;
  stageId: string;
  recommendedTopicId: string;
  completedTopicIds: string[];
}) {
  const { data: topics, isLoading } = useQuery({
    queryKey: ["topics", "stage", stageId],
    queryFn: async () => {
      const result = await topicsApi.get.list({
        stageId,
        includeSlides: false,
        includeUrls: false,
        limit: 100,
      });
      if (result.error) {
        console.error("Failed to fetch topics:", result.error);
        return [];
      }
      return (result.data || []).sort((a: any, b: any) => {
        const orderA = a.stageOrder ?? 999999;
        const orderB = b.stageOrder ?? 999999;
        return orderA - orderB;
      });
    },
    enabled: !!stageId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-6 w-12 bg-muted animate-pulse rounded flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return null;
  }

  // Find the index of the recommended topic
  const recommendedIndex = topics.findIndex((topic: any) => topic.id === recommendedTopicId);
  
  // Calculate the sliding window
  let startIndex: number;
  let endIndex: number;
  let remainingCount = 0;

  if (recommendedIndex === -1) {
    // If no recommended topic found, show first 5
    startIndex = 0;
    endIndex = Math.min(5, topics.length);
    remainingCount = topics.length - endIndex;
  } else if (recommendedIndex === 0) {
    // If recommended is first, show next 4 after it
    startIndex = 0;
    endIndex = Math.min(5, topics.length);
    remainingCount = topics.length - endIndex;
  } else {
    // Show 2 before, recommended, 2 after (total 5 visible)
    startIndex = Math.max(0, recommendedIndex - 2);
    endIndex = Math.min(topics.length, recommendedIndex + 3);
    remainingCount = topics.length - endIndex;
  }

  const visibleTopics = topics.slice(startIndex, endIndex);
  const remainingTopics = remainingCount > 0 ? topics.slice(endIndex) : [];

  return (
    <div className={`flex gap-2 overflow-x-auto ${className || ""}`}>
      {visibleTopics.map((topic: any) => {
        const isRecommended = topic.id === recommendedTopicId;
        const isCompleted = completedTopicIds.includes(topic.id);
        const isIncomplete = !isCompleted && !isRecommended;
        
        return (
          <Tooltip key={topic.id}>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-default transition-colors flex-shrink-0 ${
                  isRecommended
                    ? "border-2 border-blue-500 bg-blue-500/20 text-blue-700 font-semibold animate-pulse"
                    : isCompleted
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : isIncomplete
                    ? "border-2 border-dashed border-muted-foreground/40 bg-muted/30 text-muted-foreground"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {topic.stageOrder !== null && topic.stageOrder !== undefined ? (
                  <>L{topic.stageOrder}</>
                ) : (
                  <span className="truncate max-w-[100px]">{topic.title}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{topic.title}</p>
              {isRecommended && <p className="text-xs mt-1">Recommended</p>}
              {isCompleted && <p className="text-xs mt-1">Completed</p>}
            </TooltipContent>
          </Tooltip>
        );
      })}
      
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs cursor-default transition-colors flex-shrink-0 border-2 border-dashed border-muted-foreground/40 bg-muted/30 text-muted-foreground">
              +{remainingCount} more
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold mb-2">Remaining Lessons:</p>
              {remainingTopics.map((topic: any) => {
                const isCompleted = completedTopicIds.includes(topic.id);
                return (
                  <div key={topic.id} className="text-sm">
                    {topic.stageOrder !== null && topic.stageOrder !== undefined ? (
                      <span className={isCompleted ? "text-green-600" : ""}>
                        L{topic.stageOrder}: {topic.title}
                        {isCompleted && " ✓"}
                      </span>
                    ) : (
                      <span className={isCompleted ? "text-green-600" : ""}>
                        {topic.title}
                        {isCompleted && " ✓"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function LessonWizardRecommendation({
  recommendationData,
  isLoading,
  selectedClasses,
  schoolSlug,
  onProceedWithRecommendation,
  onChooseDifferentLesson,
  onGoToLiveLesson,
  onBack,
  onSelectStage,
  onAddClassesToLesson,
  onCancelLessons,
  onCombineLessons,
}: LessonWizardRecommendationProps) {
  const router = useRouter();
  const currentUser = useMeStore((s) => s.currentUser);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [isClassProgressExpanded, setIsClassProgressExpanded] = useState(false);
  
  // Fetch all stages to compare sortIndex values for determining higher/lower stages
  const { stages: allStages } = useStages();
  
  // Fetch stage data with years for each stage option (when multiple stages detected)
  const stageIdsForFetch = useMemo(() => {
    if (!recommendationData?.warning?.multipleStages) return [];
    return recommendationData.warning.multipleStages.map(s => s.stageId);
  }, [recommendationData?.warning?.multipleStages]);
  
  // Fetch all stage data with years in parallel
  const { data: stagesWithYearsData } = useQuery({
    queryKey: ["stages", "with-years", stageIdsForFetch.join(",")],
    queryFn: async () => {
      if (stageIdsForFetch.length === 0) return [];
      
      const stagePromises = stageIdsForFetch.map(async (stageId) => {
        const result = await curriculumApi.stages.byId(stageId);
        if (result.error) {
          console.error(`Failed to fetch stage ${stageId}:`, result.error);
          return null;
        }
        return result.data;
      });
      
      const results = await Promise.all(stagePromises);
      return results.filter((stage): stage is NonNullable<typeof stage> => stage !== null);
    },
    enabled: stageIdsForFetch.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  
  // Create a map of stageId -> stage data with years
  const stagesWithYearsMap = useMemo(() => {
    const map = new Map();
    if (stagesWithYearsData) {
      stagesWithYearsData.forEach((stage) => {
        if (stage) {
          map.set(stage.id, stage);
        }
      });
    }
    return map;
  }, [stagesWithYearsData]);
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [lessonToCancel, setLessonToCancel] = useState<string | null>(null);
  const [combineDialogOpen, setCombineDialogOpen] = useState(false);
  const [lessonsToCombine, setLessonsToCombine] = useState<string[]>([]);
  const [isAddingClasses, setIsAddingClasses] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isCombining, setIsCombining] = useState(false);
  // Fetch topic details with slides if we have a recommended topic ID
  const { data: topicData, isLoading: isLoadingTopic } = useQuery({
    queryKey: ["topic", recommendationData?.recommendedTopicId, "with-slides"],
    queryFn: async () => {
      if (!recommendationData?.recommendedTopicId) return null;
      
      const result = await topicsApi.get.byId(recommendationData.recommendedTopicId, {
        includeSlides: true,
        includeUrls: true,
      });
      
      if (result.error) {
        console.error("Failed to fetch topic:", result.error);
        return null;
      }
      
      return result.data as TopicWithSlides | null;
    },
    enabled: !!recommendationData?.recommendedTopicId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch stage data with years to get all year codes for the stage
  const { data: stageData } = useQuery({
    queryKey: ["stage", recommendationData?.recommendedTopic?.stageId, "with-years"],
    queryFn: async () => {
      if (!recommendationData?.recommendedTopic?.stageId) return null;
      
      const result = await curriculumApi.stages.byId(recommendationData.recommendedTopic.stageId);
      
      if (result.error) {
        console.error("Failed to fetch stage:", result.error);
        return null;
      }
      
      return result.data;
    },
    enabled: !!recommendationData?.recommendedTopic?.stageId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch first topic for selected stage (when multiple stages detected)
  const { data: selectedStageTopicData, isLoading: isLoadingSelectedStageTopic } = useQuery({
    queryKey: ["topics", "stage", selectedStageId, "first-topic"],
    queryFn: async () => {
      if (!selectedStageId) return null;
      
      const result = await topicsApi.get.list({
        stageId: selectedStageId,
        includeSlides: true,
        includeUrls: true,
        limit: 1,
      });
      
      if (result.error) {
        console.error("Failed to fetch topics for stage:", result.error);
        return null;
      }
      
      const topics = result.data || [];
      if (topics.length === 0) return null;
      
      // Sort by stageOrder and get the first one
      const sortedTopics = topics.sort((a: any, b: any) => {
        const orderA = a.stageOrder ?? 999999;
        const orderB = b.stageOrder ?? 999999;
        return orderA - orderB;
      });
      
      return sortedTopics[0] as TopicWithSlides | null;
    },
    enabled: !!selectedStageId && !!(recommendationData?.warning?.show && recommendationData.warning.multipleStages && recommendationData.warning.multipleStages.length > 1),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch stage data for selected stage
  const { data: selectedStageData } = useQuery({
    queryKey: ["stage", selectedStageId, "with-years"],
    queryFn: async () => {
      if (!selectedStageId) return null;
      
      const result = await curriculumApi.stages.byId(selectedStageId);
      
      if (result.error) {
        console.error("Failed to fetch stage:", result.error);
        return null;
      }
      
      return result.data;
    },
    enabled: !!selectedStageId && !!(recommendationData?.warning?.show && recommendationData.warning.multipleStages && recommendationData.warning.multipleStages.length > 1),
    staleTime: 5 * 60 * 1000,
  });

  // Calculate conflict lesson data BEFORE early returns to ensure hooks are always called in same order
  const recommendedTopic = recommendationData?.recommendedTopic ?? null;
  const activeLessons = recommendationData?.activeLessons ?? [];
  
  // Check for conflicts: any active lesson (preparing, ready, in_progress, feedback) 
  // that shares a class with the selected classes
  // Each class can only have ONE active lesson at a time
  const selectedClassIds = selectedClasses.map(c => c.id);
  const conflictingLessons = activeLessons.filter(lesson => {
    // Check if this lesson shares any class with selected classes
    return lesson.classIds.some(classId => selectedClassIds.includes(classId));
  });
  const hasConflict = conflictingLessons.length > 0;
  const conflictLesson = conflictingLessons[0]; // Get the first conflicting lesson

  // Fetch topic data for preparing conflict lesson (to show card)
  // This hook must be called before any early returns to maintain hook order
  const { data: conflictTopicData } = useQuery({
    queryKey: ["topic", conflictLesson?.topicId, "with-slides"],
    queryFn: async () => {
      if (!conflictLesson?.topicId) return null;
      
      const result = await topicsApi.get.byId(conflictLesson.topicId, {
        includeSlides: true,
        includeUrls: true,
      });
      
      if (result.error) {
        console.error("Failed to fetch conflict topic:", result.error);
        return null;
      }
      
      return result.data as TopicWithSlides | null;
    },
    enabled: !!conflictLesson?.topicId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch stage data for conflict topic
  // This hook must be called before any early returns to maintain hook order
  const { data: conflictStageData } = useQuery({
    queryKey: ["stage", conflictTopicData?.stageId, "with-years"],
    queryFn: async () => {
      if (!conflictTopicData?.stageId) return null;
      
      const result = await curriculumApi.stages.byId(conflictTopicData.stageId);
      
      if (result.error) {
        console.error("Failed to fetch conflict stage:", result.error);
        return null;
      }
      
      return result.data;
    },
    enabled: !!conflictTopicData?.stageId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch completed topics for each selected class
  const { data: completedTopicsData, isLoading: isLoadingCompletedTopics } = useQuery({
    queryKey: ["completed-topics", "classes", selectedClassIds.join(",")],
    queryFn: async () => {
      if (selectedClassIds.length === 0) return {};
      
      // Fetch completed lessons for each class
      const completedTopicsByClass: Record<string, Array<{ topicId: string; topicTitle: string; stageOrder: number | null }>> = {};
      
      // Initialize empty arrays for all classes
      selectedClasses.forEach(cls => {
        completedTopicsByClass[cls.id] = [];
      });
      
      // Fetch completed lessons for all classes in parallel
      const lessonResults = await Promise.all(
        selectedClassIds.map(async (classId) => {
          const result = await lessonsApi.get.list({
            classId,
            status: "completed",
            limit: 100, // API limit is 1-100
          });
          
          if (result.error) {
            console.error(`Failed to fetch completed lessons for class ${classId}:`, result.error);
            return { classId, lessons: [] };
          }
          
          return { classId, lessons: result.data || [] };
        })
      );
      
      // Collect all unique lesson IDs and batch fetch their details
      const allLessonIds = new Set<string>();
      const lessonIdToClassId = new Map<string, string>();
      
      lessonResults.forEach(({ classId, lessons }) => {
        lessons.forEach((lesson) => {
          allLessonIds.add(lesson.id);
          lessonIdToClassId.set(lesson.id, classId);
        });
      });
      
      // Batch fetch lesson details
      const lessonDetailsPromises = Array.from(allLessonIds).map(async (lessonId) => {
        const result = await lessonsApi.get.byId(lessonId);
        return { lessonId, data: result.data, error: result.error };
      });
      
      const lessonDetails = await Promise.all(lessonDetailsPromises);
      
      // Group topics by classId
      lessonDetails.forEach(({ lessonId, data, error }) => {
        if (error || !data?.topic) return;
        
        const classId = lessonIdToClassId.get(lessonId);
        if (!classId) return;
        
        const topic = data.topic as any;
        const topicsArray = completedTopicsByClass[classId];
        
        // Check if topic already exists
        if (!topicsArray.some(t => t.topicId === topic.id)) {
          topicsArray.push({
            topicId: topic.id,
            topicTitle: topic.title || "Unknown Topic",
            stageOrder: topic.stageOrder ?? null,
          });
        }
      });
      
      // Sort topics by stageOrder for each class
      Object.keys(completedTopicsByClass).forEach(classId => {
        completedTopicsByClass[classId].sort((a, b) => {
          const orderA = a.stageOrder ?? 999999;
          const orderB = b.stageOrder ?? 999999;
          return orderA - orderB;
        });
      });
      
      return completedTopicsByClass;
    },
    enabled: selectedClassIds.length > 0 && !hasConflict,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Skeleton Recommendation Card */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" /> {/* Badge skeleton */}
          <Card className="w-full transition-all overflow-hidden p-0 gap-0 flex flex-row h-32">
            {/* Skeleton Thumbnail */}
            <Skeleton className="h-full w-48 flex-shrink-0 rounded-l-md" />
            {/* Skeleton Content */}
            <div className="flex-1 flex flex-col justify-between p-4 pr-6 min-w-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" /> {/* Stage name */}
                <Skeleton className="h-5 w-48" /> {/* Topic title */}
                <Skeleton className="h-4 w-24" /> {/* Slide count */}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!isLoading && !recommendationData) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load recommendations</AlertTitle>
          <AlertDescription>
            Please try selecting your classes again or proceed to choose a topic manually.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onChooseDifferentLesson}>
            Choose Topic
          </Button>
        </div>
      </div>
    );
  }

  const { warning, reason, completedLessonInfo } = recommendationData;
  
  // Group active lessons by status
  const liveLessons = activeLessons.filter(l => l.status === "in_progress" || l.status === "feedback");
  const readyLessons = activeLessons.filter(l => l.status === "ready");
  const preparingLessons = activeLessons.filter(l => l.status === "preparing");
  
  const hasLiveLessons = liveLessons.length > 0;
  const canProceed = !hasConflict;

  // Calculate which classes conflict and which don't (for conflict handling)
  const conflictingClassIds = conflictingLessons.flatMap(lesson => lesson.classIds);
  const nonConflictingClasses = selectedClasses.filter(c => !conflictingClassIds.includes(c.id));
  const conflictingClasses = selectedClasses.filter(c => conflictingClassIds.includes(c.id));
  const isSingleClass = selectedClasses.length === 1;
  const conflictLessonOwner = conflictLesson ? currentUser?.id === conflictLesson.createdByUserId : false;

  // Calculate slide count
  const slideCount = topicData?.slides?.length || topicData?.slideCount || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Conflict Alert - Separate Card */}
      {hasConflict && conflictLesson && conflictTopicData && (
        <div className="flex flex-col gap-4">
          <Alert className="bg-amber-50 border-amber-300 text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">Lesson Already Being Prepared</AlertTitle>
            <AlertDescription className="text-amber-800 mt-2">
              {isSingleClass ? (
                <>
                  <p className="text-sm mb-2">
                    You already have a lesson being prepared for <span className="font-medium">{conflictingClasses[0]?.name}</span>. You cannot have two lessons being prepared for the same class.
                  </p>
                  <p className="text-sm">
                    Go to the lesson page to resolve this before continuing.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm mb-2">
                    You already have a lesson being prepared for {conflictingClasses.length > 0 && (
                      <span className="font-medium">{conflictingClasses.map(c => c.name).join(", ")}</span>
                    )}. You cannot have two lessons being prepared for the same class.
                  </p>
                  {nonConflictingClasses.length > 0 && conflictLessonOwner && (
                    <p className="text-sm mb-2">
                      The other class{nonConflictingClasses.length > 1 ? "es" : ""} you've selected ({nonConflictingClasses.map(c => c.name).join(", ")}) {nonConflictingClasses.length > 1 ? "don't" : "doesn't"} have a prepared lesson. You can add {nonConflictingClasses.length > 1 ? "them" : "it"} to the existing lesson if you'd like.
                    </p>
                  )}
                  <p className="text-sm">
                    Go to the lesson page to resolve this or add the other class{nonConflictingClasses.length > 1 ? "es" : ""} to the existing lesson.
                  </p>
                </>
              )}
            </AlertDescription>
          </Alert>
          
          <Separator />
          
          {/* Full-width topic card */}
          <Card className="w-full transition-all overflow-hidden p-0 gap-0 flex flex-row h-32">
            {/* Thumbnail on the left */}
            <TopicThumbnail topic={conflictTopicData} horizontal={true} />
            
            {/* Information on the right */}
            <div className="flex-1 flex flex-col justify-between p-4 pr-6 min-w-0 overflow-hidden">
              <div className="space-y-2 min-w-0 w-full">
                {conflictStageData?.name && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      {conflictStageData.name}
                    </p>
                    {(() => {
                      // Get year codes from stage data, sorted by sortIndex
                      if (!conflictStageData?.years || !Array.isArray(conflictStageData.years)) return null;
                      
                      const sortedYears = [...conflictStageData.years].sort((a: any, b: any) => {
                        const aIndex = a.sortIndex ?? 999999;
                        const bIndex = b.sortIndex ?? 999999;
                        return aIndex - bIndex;
                      });
                      
                      const yearCodes = sortedYears
                        .map((year: any) => year.code)
                        .filter((code: string) => code);
                      
                      return yearCodes.length > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {yearCodes.map((code: string, index: number) => (
                            <span key={code} className="flex items-center gap-1">
                              {index > 0 && <span className="opacity-25">•</span>}
                              {code}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
                <div className="flex items-center gap-1 min-w-0 w-full overflow-hidden">
                  {conflictTopicData.stageOrder !== null && conflictTopicData.stageOrder !== undefined && (
                    <Badge
                      variant="secondary"
                      className="text-xs text-muted-foreground font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
                    >
                      L{conflictTopicData.stageOrder}
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="text-lg font-semibold text-primary capitalize truncate block min-w-0 flex-1 max-w-full cursor-default">
                        {conflictTopicData.title}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{conflictTopicData.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-4">
                  <Badge
                    variant="outline"
                    className="text-xs py-0 px-1.5 h-5"
                  >
                    {(conflictTopicData.slides?.length || conflictTopicData.slideCount || 0)} {(conflictTopicData.slides?.length || conflictTopicData.slideCount || 0) === 1 ? "slide" : "slides"}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {!isSingleClass && nonConflictingClasses.length > 0 && conflictLessonOwner && onAddClassesToLesson && (
              <Button
                onClick={async () => {
                  setIsAddingClasses(true);
                  try {
                    await onAddClassesToLesson(conflictLesson.lessonId, nonConflictingClasses.map(c => c.id));
                  } catch (error) {
                    console.error("Failed to add classes:", error);
                  } finally {
                    setIsAddingClasses(false);
                  }
                }}
                disabled={isAddingClasses}
                variant="outline"
                className="w-full"
              >
                {isAddingClasses ? "Adding..." : `Add ${nonConflictingClasses.map(c => c.name).join(", ")} to lesson`}
              </Button>
            )}
            <Button
              onClick={() => {
                if (conflictLesson.schoolSlug) {
                  router.push(`/schools/${conflictLesson.schoolSlug}/lessons/${conflictLesson.lessonId}`);
                } else {
                  window.location.href = `/schools/${schoolSlug}/lessons/${conflictLesson.lessonId}`;
                }
              }}
              className="w-full"
            >
              Go to lesson
            </Button>
          </div>
        </div>
      )}
      
      {/* Recommended Topic Card */}
      {recommendedTopic && !hasConflict && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-sm bg-blue-500/20 text-blue-700 border-blue-500 flex items-center gap-1.5 font-semibold"
            >
              <Star className="h-3.5 w-3.5 fill-blue-700" />
              Recommended Lesson
            </Badge>
            <ChevronsRight className="h-4 w-4 text-muted-foreground" />
            {/* Class badges with overflow handling */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedClasses.slice(0, 3).map((cls) => (
                <Badge
                  key={cls.id}
                  variant="secondary"
                  className="text-xs"
                >
                  {cls.name}
                </Badge>
              ))}
              {selectedClasses.length > 3 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="text-xs cursor-pointer"
                    >
                      +{selectedClasses.length - 3} more
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-col gap-1">
                      {selectedClasses.slice(3).map((cls) => (
                        <span key={cls.id} className="text-sm">
                          {cls.name}
                        </span>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          
          {isLoadingTopic ? (
            <>
              <Card className="w-full transition-all overflow-hidden p-0 gap-0 flex flex-row h-32">
                {/* Skeleton Thumbnail */}
                <Skeleton className="h-full w-48 flex-shrink-0 rounded-l-md" />
                {/* Skeleton Content */}
                <div className="flex-1 flex flex-col justify-between p-4 pr-6 min-w-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" /> {/* Stage name */}
                      <Skeleton className="h-3 w-24" /> {/* Year codes */}
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-5 w-8 rounded-sm" /> {/* Badge */}
                      <Skeleton className="h-5 w-48" /> {/* Topic title */}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Skeleton className="h-5 w-20" /> {/* Slide count badge */}
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Skeleton Information card */}
              <Alert className="bg-muted/5 text-muted-foreground border-0">
                <Skeleton className="h-4 w-4 rounded" />
                <AlertDescription className="text-muted-foreground space-y-2">
                  <Skeleton className="h-4 w-full max-w-md" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </AlertDescription>
              </Alert>

              {/* Skeleton Class Progress Tab */}
              {selectedClasses.length > 0 && recommendedTopic?.stageId && (
                <div className="mt-4">
                  <div className="flex justify-center mx-8">
                    <Separator className="w-1/2" />
                  </div>
                  {/* Tab Button */}
                  <button
                    disabled
                    className="w-full bg-card border rounded-t-lg shadow-sm"
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                  </button>

                  {/* Expanded Content Skeleton */}
                  <div className="bg-card border-x border-b rounded-b-lg overflow-hidden">
                    <div className="px-4 py-4 space-y-4">
                      {selectedClasses.map((cls) => (
                        <div key={cls.id} className="flex items-center justify-between gap-4">
                          <Skeleton className="h-5 w-32 flex-shrink-0" />
                          <div className="flex gap-2 overflow-x-auto">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Skeleton key={i} className="h-6 w-12 rounded flex-shrink-0" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : topicData ? (
            <Card className="w-full transition-all overflow-hidden p-0 gap-0 flex flex-row h-32">
              {/* Thumbnail on the left */}
              <TopicThumbnail topic={topicData} horizontal={true} />
              
              {/* Information on the right */}
              <div className="flex-1 flex flex-col justify-between p-4 pr-6 min-w-0 overflow-hidden">
                <div className="space-y-2 min-w-0 w-full">
                  {recommendedTopic.stageName && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">
                        {recommendedTopic.stageName}
                      </p>
                      {(() => {
                        // Get year codes from stage data, sorted by sortIndex
                        if (!stageData?.years || !Array.isArray(stageData.years)) return null;
                        
                        const sortedYears = [...stageData.years].sort((a: any, b: any) => {
                          const aIndex = a.sortIndex ?? 999999;
                          const bIndex = b.sortIndex ?? 999999;
                          return aIndex - bIndex;
                        });
                        
                        const yearCodes = sortedYears
                          .map((year: any) => year.code)
                          .filter((code: string) => code);
                        
                        return yearCodes.length > 0 ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {yearCodes.map((code: string, index: number) => (
                              <span key={code} className="flex items-center gap-1">
                                {index > 0 && <span className="opacity-25">•</span>}
                                {code}
                              </span>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  <div className="flex items-center gap-1 min-w-0 w-full overflow-hidden">
                    {topicData.stageOrder !== null && topicData.stageOrder !== undefined && (
                      <Badge
                        variant="secondary"
                        className="text-xs text-muted-foreground font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
                      >
                        L{topicData.stageOrder}
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h3 className="text-lg font-semibold text-primary capitalize truncate block min-w-0 flex-1 max-w-full cursor-default">
                          {topicData.title}
                        </h3>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{topicData.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-4">
                    <Badge
                      variant="outline"
                      className="text-xs py-0 px-1.5 h-5"
                    >
                      {slideCount} {slideCount === 1 ? "slide" : "slides"}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Alert className="bg-blue-50 border-blue-300 text-blue-900">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Recommended Topic</AlertTitle>
              <AlertDescription className="text-blue-800 mt-2">
                <p className="font-medium">{recommendedTopic.title}</p>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Information card about proceeding */}
          <Alert className="bg-muted/5 text-muted-foreground border-0">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground">
              If you're happy with this recommendation, you can click proceed. Otherwise, if you'd like to choose another lesson, click Choose another topic.
            </AlertDescription>
          </Alert>

          {/* Class Progress Tab */}
          {selectedClasses.length > 0 && recommendedTopic?.stageId && (
            <div className="mt-4">
              <div className="flex justify-center mx-8">
                <Separator className="w-1/2" />
              </div>
              {/* Tab Button */}
              <button
                onClick={() => setIsClassProgressExpanded(!isClassProgressExpanded)}
                className="w-full bg-card border rounded-t-lg shadow-sm hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-semibold text-muted-foreground">Class Progress</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      isClassProgressExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Content */}
              <div
                className={`bg-card border-x border-b rounded-b-lg overflow-hidden transition-all duration-300 ease-in-out ${
                  isClassProgressExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-4 py-4 max-h-96 overflow-y-auto space-y-4">
                  {isLoadingCompletedTopics ? (
                    <div className="space-y-3">
                      {selectedClasses.map((cls) => (
                        <div key={cls.id} className="flex items-center justify-between gap-4">
                          <Skeleton className="h-5 w-32 flex-shrink-0" />
                          <div className="flex gap-2 overflow-x-auto">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Skeleton key={i} className="h-6 w-12 rounded flex-shrink-0" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedClasses.map((cls) => {
                        const completedTopics = completedTopicsData?.[cls.id] || [];
                        const completedTopicIds = completedTopics.map(t => t.topicId);
                        return (
                          <div key={cls.id} className="flex items-center justify-between gap-4">
                            <h4 className="text-sm font-medium flex-shrink-0">{cls.name}</h4>
                            <TopicProgressList
                              className="flex-shrink-0"
                              stageId={recommendedTopic.stageId}
                              recommendedTopicId={recommendedTopic.id}
                              completedTopicIds={completedTopicIds}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Warning Alert - Multiple Curriculum Stages */}
      {!hasConflict && warning?.show && warning.multipleStages && warning.multipleStages.length > 1 && !selectedStageId && (
        <Alert className="bg-amber-50 border-amber-300 text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">
            Multiple Lesson Levels Detected
          </AlertTitle>
          <AlertDescription className="text-amber-800 mt-2">
            <p className="text-sm">
              The classes you've selected {selectedClasses.length === 1 ? (
                <>(<span className="font-bold">{selectedClasses[0].name}</span>)</>
              ) : selectedClasses.length === 2 ? (
                <>(<span className="font-bold">{selectedClasses[0].name}</span> and <span className="font-bold">{selectedClasses[1].name}</span>)</>
              ) : (
                <>
                  ({selectedClasses.slice(0, -1).map((cls, idx) => (
                    <span key={cls.id}>
                      {idx > 0 && ", "}
                      <span className="font-bold">{cls.name}</span>
                    </span>
                  ))} and <span className="font-bold">{selectedClasses[selectedClasses.length - 1].name}</span>)
                </>
              )} belong to different lesson levels. If you're sure you've chosen the correct classes, please choose which level you'd like to use for this lesson.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Stage Selection View - Only show when multiple stages detected and no stage selected */}
      {!hasConflict && warning?.show && warning.multipleStages && warning.multipleStages.length > 1 && !selectedStageId && (
        <div className="space-y-3">
          {warning.multipleStages.map((stageOption) => {
            // Get current stage's sortIndex
            const currentStageSortIndex = stageOption.stageSortIndex ?? 999999;
            
            // Find classes that belong to this stage (normal)
            const classesInThisStage = stageOption.classes.map(cls => cls.classId);
            
            // Find classes that don't belong to this stage
            const otherSelectedClasses = selectedClasses.filter(
              cls => !classesInThisStage.includes(cls.id)
            );
            
            // For each other class, determine which stage it belongs to and if it's higher/lower
            const otherClassesWithStageInfo = otherSelectedClasses.map(cls => {
              // Find which stage this class belongs to
              const classStageOption = warning.multipleStages?.find(stage =>
                stage.classes.some(c => c.classId === cls.id)
              );
              
              if (!classStageOption) return null;
              
              const classStageSortIndex = classStageOption.stageSortIndex ?? 999999;
              const isHigher = classStageSortIndex > currentStageSortIndex;
              const isLower = classStageSortIndex < currentStageSortIndex;
              
              return {
                class: cls,
                isHigher,
                isLower,
              };
            }).filter((item): item is { class: ClassOption; isHigher: boolean; isLower: boolean } => item !== null);
            
            return (
              <Card
                key={stageOption.stageId}
                className="cursor-pointer transition-all p-4 border-border hover:border-primary/50 hover:shadow-md"
                onClick={() => {
                  setSelectedStageId(stageOption.stageId);
                  if (onSelectStage) {
                    onSelectStage(stageOption.stageId);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-semibold text-base">{stageOption.stageName}</h4>
                      {(() => {
                        const stageData = stagesWithYearsMap.get(stageOption.stageId);
                        if (!stageData?.years || !Array.isArray(stageData.years) || stageData.years.length === 0) {
                          return null;
                        }
                        
                        const sortedYears = [...stageData.years].sort((a: any, b: any) => {
                          const aIndex = a.sortIndex ?? 999999;
                          const bIndex = b.sortIndex ?? 999999;
                          return aIndex - bIndex;
                        });
                        
                        const yearCodes = sortedYears
                          .map((year: any) => year.code)
                          .filter((code: string) => code);
                        
                        return yearCodes.length > 0 ? (
                          <>
                            <ChevronsRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-normal">Years {yearCodes.join(", ")}</span>
                          </>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {/* Normal classes (belong to this stage) */}
                      {stageOption.classes.map((cls) => (
                        <Badge key={cls.classId} variant="outline" className="text-xs">
                          {cls.className}
                        </Badge>
                      ))}
                      
                      {/* Classes from other stages */}
                      {otherClassesWithStageInfo.map(({ class: cls, isHigher, isLower }) => (
                        <Tooltip key={cls.id}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                isHigher || isLower
                                  ? "bg-orange-50 text-orange-700 border-orange-300"
                                  : ""
                              }`}
                            >
                              {isHigher && <ChevronsDown className="h-3 w-3 inline animate-[var(--animate-bounce-gentle)]" />}
                              {isLower && <ChevronsUp className="h-3 w-3 inline animate-[var(--animate-bounce-gentle)]" />}
                              {cls.name}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {isHigher
                                ? "This class is being added to a lower lesson level"
                                : isLower
                                ? "You are adding this class to a higher lesson level"
                                : cls.name}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recommended Lesson View for Selected Stage */}
      {!hasConflict && warning?.show && warning.multipleStages && warning.multipleStages.length > 1 && selectedStageId && (
        selectedStageTopicData ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-sm bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1.5"
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-700" />
                    Recommended Lesson
                  </Badge>
                  <ChevronsRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedClasses.slice(0, 3).map((cls) => (
                      <Badge
                        key={cls.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        {cls.name}
                      </Badge>
                    ))}
                    {selectedClasses.length > 3 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="text-xs cursor-pointer"
                          >
                            +{selectedClasses.length - 3} more
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="flex flex-col gap-1">
                            {selectedClasses.slice(3).map((cls) => (
                              <span key={cls.id} className="text-sm">
                                {cls.name}
                              </span>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {isLoadingSelectedStageTopic ? (
                  <>
                    <Card className="w-full transition-all overflow-hidden p-0 gap-0 flex flex-row h-32">
                      {/* Skeleton Thumbnail */}
                      <Skeleton className="h-full w-48 flex-shrink-0 rounded-l-md" />
                      {/* Skeleton Content */}
                      <div className="flex-1 flex flex-col justify-between p-4 pr-6 min-w-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-32" /> {/* Stage name */}
                            <Skeleton className="h-3 w-24" /> {/* Year codes */}
                          </div>
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-5 w-8 rounded-sm" /> {/* Badge */}
                            <Skeleton className="h-5 w-48" /> {/* Topic title */}
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            <Skeleton className="h-5 w-20" /> {/* Slide count badge */}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Skeleton Information card */}
                    <Alert className="bg-muted/5 text-muted-foreground border-0">
                      <Skeleton className="h-4 w-4 rounded" />
                      <AlertDescription className="text-muted-foreground space-y-2">
                        <Skeleton className="h-4 w-full max-w-md" />
                        <Skeleton className="h-4 w-full max-w-sm" />
                      </AlertDescription>
                    </Alert>

                    <Separator className="w-full" />

                    {/* Skeleton Class Progress Tab */}
                    {selectedClasses.length > 0 && selectedStageId && (
                      <div className="mt-4">
                        {/* Tab Button */}
                        <button
                          disabled
                          className="w-full bg-card border rounded-t-lg shadow-sm"
                        >
                          <div className="flex items-center justify-between px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4 rounded" />
                          </div>
                        </button>

                        {/* Expanded Content Skeleton */}
                        <div className="bg-card border-x border-b rounded-b-lg overflow-hidden">
                          <div className="px-4 py-4 space-y-4">
                            {selectedClasses.map((cls) => (
                              <div key={cls.id} className="flex items-center justify-between gap-4">
                                <Skeleton className="h-5 w-32 flex-shrink-0" />
                                <div className="flex gap-2 overflow-x-auto">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-6 w-12 rounded flex-shrink-0" />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : selectedStageTopicData ? (
                  <Card className="w-full transition-all overflow-hidden p-0 gap-0 flex flex-row h-32">
                    <TopicThumbnail topic={selectedStageTopicData} horizontal={true} />
                    <div className="flex-1 flex flex-col justify-between p-4 pr-6 min-w-0 overflow-hidden">
                      <div className="space-y-2 min-w-0 w-full">
                        {selectedStageData?.name && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                              {selectedStageData.name}
                            </p>
                            {selectedStageData.years && Array.isArray(selectedStageData.years) && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {selectedStageData.years
                                  .sort((a: any, b: any) => (a.sortIndex ?? 999999) - (b.sortIndex ?? 999999))
                                  .map((year: any, index: number) => (
                                    <span key={year.id} className="flex items-center gap-1">
                                      {index > 0 && <span className="opacity-25">•</span>}
                                      {year.code}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1 min-w-0 w-full overflow-hidden">
                          {selectedStageTopicData.stageOrder !== null && selectedStageTopicData.stageOrder !== undefined && (
                            <Badge
                              variant="secondary"
                              className="text-xs text-muted-foreground font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
                            >
                              L{selectedStageTopicData.stageOrder}
                            </Badge>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h3 className="text-lg font-semibold text-primary capitalize truncate block min-w-0 flex-1 max-w-full cursor-default">
                                {selectedStageTopicData.title}
                              </h3>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{selectedStageTopicData.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-4">
                          <Badge
                            variant="outline"
                            className="text-xs py-0 px-1.5 h-5"
                          >
                            {(selectedStageTopicData.slides?.length || selectedStageTopicData.slideCount || 0)} {(selectedStageTopicData.slides?.length || selectedStageTopicData.slideCount || 0) === 1 ? "slide" : "slides"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : null}

                {/* Information card about proceeding */}
                <Alert className="bg-muted/5 text-muted-foreground border-0">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <AlertDescription className="text-muted-foreground">
                    If you're happy with this recommendation, you can click proceed. Otherwise, if you'd like to choose another lesson, click Choose another topic.
                  </AlertDescription>
                </Alert>

             
                      <Separator className="w-full" />
                   

                {/* Class Progress Tab */}
                {selectedClasses.length > 0 && selectedStageId && selectedStageData && (
                  <div className="mt-4">
                   
                    {/* Tab Button */}
                    <button
                      onClick={() => setIsClassProgressExpanded(!isClassProgressExpanded)}
                      className="w-full bg-card border rounded-t-lg shadow-sm hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm font-semibold text-muted-foreground">Class Progress</span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            isClassProgressExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Expanded Content */}
                    <div
                      className={`bg-card border-x border-b rounded-b-lg overflow-hidden transition-all duration-300 ease-in-out ${
                        isClassProgressExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="px-4 py-4 max-h-96 overflow-y-auto space-y-4">
                        {isLoadingCompletedTopics ? (
                          <div className="space-y-3">
                            {selectedClasses.map((cls) => (
                              <div key={cls.id} className="flex items-center justify-between gap-4">
                                <Skeleton className="h-5 w-32 flex-shrink-0" />
                                <div className="flex gap-2 overflow-x-auto">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-6 w-12 rounded flex-shrink-0" />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedClasses.map((cls) => {
                              const completedTopics = completedTopicsData?.[cls.id] || [];
                              const completedTopicIds = completedTopics.map(t => t.topicId);
                              const selectedStageTopicId = selectedStageTopicData?.id || null;
                              return (
                                <div key={cls.id} className="flex items-center justify-between gap-4">
                                  <h4 className="text-sm font-medium flex-shrink-0">{cls.name}</h4>
                                  <TopicProgressList
                                    className="flex-shrink-0"
                                    stageId={selectedStageId}
                                    recommendedTopicId={selectedStageTopicId}
                                    completedTopicIds={completedTopicIds}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null
      )}

      {/* Warning Alert - Classes on Different Topics */}
      {!hasConflict && warning?.show && warning.classes.length > 0 && !warning.multipleStages && (
        <Alert className="bg-yellow-50 border-yellow-300 text-yellow-800">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900">
            Classes are on different topics
          </AlertTitle>
          <AlertDescription className="text-yellow-800 mt-2">
            <div className="space-y-1">
              {warning.classes.map((classInfo) => (
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

      {/* Active Lessons Display */}
      {activeLessons.length > 0 && (
        <div className="space-y-4">
          {/* Live Lessons (in_progress/feedback) - Blocking */}
          {liveLessons.length > 0 && (
            <div className="space-y-3">
              {liveLessons.map((lesson) => {
                const isOwner = currentUser?.id === lesson.createdByUserId;
                const isFeedback = lesson.status === "feedback";
                
                return (
                  <Alert key={lesson.lessonId} className="bg-red-50 border-red-300 text-red-900">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-900">
                      {isFeedback ? "Feedback Required" : "Live Lesson in Progress"}
                    </AlertTitle>
                    <AlertDescription className="text-red-800 mt-2">
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-sm">
                            Topic: <span className="font-medium">{lesson.topicTitle}</span>
                          </p>
                          <p className="text-sm">
                            Classes: <span className="font-medium">{lesson.className}</span>
                          </p>
                          <p className="text-sm">
                            Owner: <span className="font-medium">
                              {isOwner ? "You are the owner" : (lesson.ownerName || lesson.ownerEmail || "Unknown")}
                            </span>
                          </p>
                        </div>
                        <p className="text-sm">
                          In order to proceed, you must either complete the lesson thoroughly (go through all slides, give feedback, and mark as completed) or cancel this lesson if you are the owner.
                        </p>
                        <div className="flex gap-2">
                          {isOwner && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setLessonToCancel(lesson.lessonId);
                                setCancelDialogOpen(true);
                              }}
                              disabled={isCanceling}
                            >
                              {isCanceling ? "Canceling..." : "Cancel this lesson"}
                            </Button>
                          )}
                          {!isOwner && (
                            <p className="text-sm">
                              Contact {lesson.ownerName || lesson.ownerEmail || "the owner"} to cancel their lesson.
                            </p>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              if (lesson.schoolSlug) {
                                if (isFeedback) {
                                  router.push(`/schools/${lesson.schoolSlug}/lessons/${lesson.lessonId}/feedback`);
                                } else {
                                  onGoToLiveLesson(lesson.lessonId);
                                }
                              } else {
                                const route = isFeedback ? "/feedback" : "";
                                window.location.href = `/schools/${schoolSlug}/lessons/${lesson.lessonId}${route}`;
                              }
                            }}
                          >
                            {isFeedback ? "Go to Feedback" : "Go to Live Lesson"}
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}

          {/* Preparing Lessons - Informational (excluding conflicts already shown above) */}
          {preparingLessons.filter(l => !conflictingLessons.includes(l)).length > 0 && (
            <div className="space-y-3">
              {preparingLessons.filter(l => !conflictingLessons.includes(l)).map((lesson) => {
                const isOwner = currentUser?.id === lesson.createdByUserId;
                const selectedClassIds = selectedClasses.map(c => c.id);
                const lessonClassIds = lesson.classIds;
                const classesNotInLesson = selectedClasses.filter(c => !lessonClassIds.includes(c.id));
                const canAddClasses = classesNotInLesson.length > 0 && isOwner;
                
                return (
                  <Alert key={lesson.lessonId} className="bg-amber-50 border-amber-300 text-amber-900">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Lesson Being Prepared</AlertTitle>
                    <AlertDescription className="text-amber-800 mt-2">
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-sm">
                            Topic: <span className="font-medium">{lesson.topicTitle}</span>
                          </p>
                          <p className="text-sm">
                            Classes: <span className="font-medium">{lesson.className}</span>
                          </p>
                          <p className="text-sm">
                            Owner: <span className="font-medium">
                              {isOwner ? "You are the owner" : (lesson.ownerName || lesson.ownerEmail || "Unknown")}
                            </span>
                          </p>
                        </div>
                        {canAddClasses && (
                          <div className="space-y-2">
                            <p className="text-sm">
                              Would you like to add {classesNotInLesson.map(c => c.name).join(", ")} to this lesson?
                            </p>
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (onAddClassesToLesson) {
                                  setIsAddingClasses(true);
                                  try {
                                    await onAddClassesToLesson(lesson.lessonId, classesNotInLesson.map(c => c.id));
                                  } catch (error) {
                                    console.error("Failed to add classes:", error);
                                  } finally {
                                    setIsAddingClasses(false);
                                  }
                                }
                              }}
                              disabled={isAddingClasses}
                            >
                              {isAddingClasses ? "Adding..." : `Add ${classesNotInLesson.map(c => c.name).join(", ")} to lesson`}
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => {
                            if (lesson.schoolSlug) {
                              router.push(`/schools/${lesson.schoolSlug}/lessons/${lesson.lessonId}`);
                            } else {
                              window.location.href = `/schools/${schoolSlug}/lessons/${lesson.lessonId}`;
                            }
                          }}
                        >
                          Go to lesson
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}

          {/* Ready Lessons - Informational */}
          {readyLessons.length > 0 && (
            <div className="space-y-3">
              {readyLessons.map((lesson) => {
                const isOwner = currentUser?.id === lesson.createdByUserId;
                
                return (
                  <Alert key={lesson.lessonId} className="bg-blue-50 border-blue-300 text-blue-900">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900">Lesson Ready</AlertTitle>
                    <AlertDescription className="text-blue-800 mt-2">
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-sm">
                            Topic: <span className="font-medium">{lesson.topicTitle}</span>
                          </p>
                          <p className="text-sm">
                            Classes: <span className="font-medium">{lesson.className}</span>
                          </p>
                          <p className="text-sm">
                            Owner: <span className="font-medium">
                              {isOwner ? "You are the owner" : (lesson.ownerName || lesson.ownerEmail || "Unknown")}
                            </span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (lesson.schoolSlug) {
                              router.push(`/schools/${lesson.schoolSlug}/lessons/${lesson.lessonId}`);
                            } else {
                              window.location.href = `/schools/${schoolSlug}/lessons/${lesson.lessonId}`;
                            }
                          }}
                        >
                          Go to lesson
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}

          {/* Combine Lessons Option - If user owns multiple ready/preparing lessons */}
          {(() => {
            const ownedLessons = activeLessons.filter(l => 
              currentUser?.id === l.createdByUserId && 
              (l.status === "ready" || l.status === "preparing")
            );
            
            if (ownedLessons.length > 1 && onCombineLessons) {
              const allClassIds = new Set<string>();
              ownedLessons.forEach(l => l.classIds.forEach(id => allClassIds.add(id)));
              
              return (
                <Alert className="bg-purple-50 border-purple-300 text-purple-900">
                  <Info className="h-4 w-4 text-purple-600" />
                  <AlertTitle className="text-purple-900">Multiple Active Lessons</AlertTitle>
                  <AlertDescription className="text-purple-800 mt-2">
                    <div className="space-y-3">
                      <p className="text-sm">
                        You own {ownedLessons.length} active lessons. Would you like to cancel all of them and create a new combined lesson?
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setLessonsToCombine(ownedLessons.map(l => l.lessonId));
                          setCombineDialogOpen(true);
                        }}
                        disabled={isCombining}
                      >
                        {isCombining ? "Combining..." : "Cancel and Create New Lesson"}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Cancel Lesson Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this lesson? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Lesson</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (lessonToCancel && onCancelLessons) {
                  setIsCanceling(true);
                  try {
                    await onCancelLessons([lessonToCancel]);
                    setCancelDialogOpen(false);
                    setLessonToCancel(null);
                    // Refresh recommendations
                    window.location.reload();
                  } catch (error) {
                    console.error("Failed to cancel lesson:", error);
                  } finally {
                    setIsCanceling(false);
                  }
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Lesson
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Combine Lessons Dialog */}
      <AlertDialog open={combineDialogOpen} onOpenChange={setCombineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel and Create Combined Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel {lessonsToCombine.length} active lesson{lessonsToCombine.length > 1 ? "s" : ""} and create a new combined lesson with all selected classes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Lessons</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (lessonsToCombine.length > 0 && onCombineLessons) {
                  setIsCombining(true);
                  try {
                    const allClassIds = new Set<string>();
                    activeLessons
                      .filter(l => lessonsToCombine.includes(l.lessonId))
                      .forEach(l => l.classIds.forEach(id => allClassIds.add(id)));
                    
                    await onCombineLessons(lessonsToCombine, Array.from(allClassIds));
                    setCombineDialogOpen(false);
                    setLessonsToCombine([]);
                    // Refresh recommendations
                    window.location.reload();
                  } catch (error) {
                    console.error("Failed to combine lessons:", error);
                  } finally {
                    setIsCombining(false);
                  }
                }
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Cancel and Create New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
