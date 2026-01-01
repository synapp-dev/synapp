"use client";

import { useState, useEffect } from "react";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2, Check, Star } from "lucide-react";
import type { TopicOption, ClassOption } from "@/types/lesson-wizard";
import { topicsApi } from "@/entities/topics/api/endpoints";

interface LessonWizardTopicProps {
  selectedTopic: TopicOption | null;
  selectedClasses: ClassOption[];
  onTopicChange: (topic: TopicOption | null) => void;
}

export function LessonWizardTopic({
  selectedTopic,
  selectedClasses,
  onTopicChange,
}: LessonWizardTopicProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(
    new Set()
  );
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch topics from the view which includes all necessary data
        const result = await topicsApi.get.list({ useView: true });

        if (result.error || !result.data) {
          setError(result.error?.message || "Failed to load topics");
          setTopics([]);
          return;
        }

        // Transform view data to TopicOption format
        const topicsFromView = result.data.map((item: any) => {
          // Handle array fields - they might come as strings or arrays
          let completedClassIds: string[] = [];
          const idsRaw = item.completedClassIds || item.completed_class_ids;
          if (Array.isArray(idsRaw)) {
            completedClassIds = idsRaw;
          } else if (typeof idsRaw === "string" && idsRaw.trim() !== "") {
            // Parse PostgreSQL array format: {uuid1,uuid2,...} or ["uuid1","uuid2"]
            try {
              // Try JSON parse first
              completedClassIds = JSON.parse(idsRaw);
            } catch {
              // If not JSON, try PostgreSQL array format
              const cleaned = idsRaw.replace(/[{}"]/g, "");
              completedClassIds = cleaned
                ? cleaned.split(",").filter(Boolean)
                : [];
            }
          }

          return {
            id: item.topicId || item.topic_id,
            title: item.topicTitle || item.topic_title,
            stageCode: item.stageCode || item.stage_code,
            stageName: item.stageName || item.stage_name,
            stageId: item.stageId || item.stage_id,
            stageSortIndex:
              item.stageSortIndex ?? item.stage_sort_index ?? 999999,
            stageOrder: item.stageOrder ?? item.stage_order ?? null,
            slideCount: item.slideCount || item.slide_count || 0,
            description:
              item.topicDescription ||
              item.topic_description ||
              item.topicTitle ||
              item.topic_title,
            completedClassIds,
          } as TopicOption & {
            completedClassIds?: string[];
            stageId?: string;
            stageSortIndex?: number;
            stageOrder?: number | null;
          };
        });

        setTopics(topicsFromView);
      } catch (err: any) {
        console.error("Failed to fetch topics:", err);
        setError(err.message || "Failed to load topics. Please try again.");
        setTopics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  const [recommendedTopicIds, setRecommendedTopicIds] = useState<Set<string>>(
    new Set()
  );

  // Determine completed topics and recommended next topics based on selected classes
  useEffect(() => {
    if (selectedClasses.length === 0) {
      setCompletedTopicIds(new Set());
      setRecommendedTopicIds(new Set());
      return;
    }

    // Get class IDs from selected classes
    const selectedClassIds = new Set(selectedClasses.map((c) => c.id));

    // Check which topics have been completed by any of the selected classes
    const completedTopics = new Set<string>();

    topics.forEach((topic: any) => {
      const completedClassIds = topic.completedClassIds || [];
      // Check if any of the selected classes have completed this topic
      const hasCompleted = completedClassIds.some((classId: string) =>
        selectedClassIds.has(classId)
      );

      if (hasCompleted) {
        completedTopics.add(topic.id);
      }
    });

    setCompletedTopicIds(completedTopics);

    // Find recommended topics (next sequential topic after highest completed in each stage)
    const recommendedTopics = new Set<string>();

    // Group topics by stage
    const topicsByStage = new Map<string, any[]>();
    topics.forEach((topic: any) => {
      const stageId = topic.stageId || topic.stage_id;
      if (stageId) {
        if (!topicsByStage.has(stageId)) {
          topicsByStage.set(stageId, []);
        }
        topicsByStage.get(stageId)!.push(topic);
      }
    });

    // For each stage, find the highest completed topic order and recommend the next one
    topicsByStage.forEach((stageTopics, stageId) => {
      // Sort topics by stageOrder (nulls last)
      const sortedTopics = [...stageTopics].sort((a, b) => {
        const orderA = a.stageOrder ?? a.stage_order ?? 999999;
        const orderB = b.stageOrder ?? b.stage_order ?? 999999;
        return orderA - orderB;
      });

      // Find the highest completed topic order in this stage
      let highestCompletedOrder = -1;
      sortedTopics.forEach((topic) => {
        if (completedTopics.has(topic.id)) {
          const order = topic.stageOrder ?? topic.stage_order ?? 0;
          if (order > highestCompletedOrder) {
            highestCompletedOrder = order;
          }
        }
      });

      // Find the next topic after the highest completed one
      if (highestCompletedOrder >= 0) {
        const nextTopic = sortedTopics.find((topic) => {
          const order = topic.stageOrder ?? topic.stage_order ?? 999999;
          return order > highestCompletedOrder;
        });

        if (nextTopic) {
          recommendedTopics.add(nextTopic.id);
        }
      }
      // Note: We don't recommend the first topic if none are completed - only recommend after completed ones
    });

    setRecommendedTopicIds(recommendedTopics);
  }, [selectedClasses, topics]);

  const filteredTopics = topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.stageCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group topics by stage for categorization
  const topicsByStage = filteredTopics.reduce(
    (acc, topic) => {
      const stageId = (topic as any).stageId || "";
      const stageName = topic.stageName || "Unknown Stage";
      const stageSortIndex = (topic as any).stageSortIndex ?? 999999;

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
        topics: any[];
      }
    >
  );

  // Sort stages by sortIndex, then sort topics within each stage by stageOrder
  const sortedStages = Object.values(topicsByStage)
    .sort((a, b) => a.stageSortIndex - b.stageSortIndex)
    .map((stage) => ({
      ...stage,
      topics: stage.topics.sort((a, b) => {
        const orderA =
          (a as any).stageOrder ?? (a as any).stage_order ?? 999999;
        const orderB =
          (b as any).stageOrder ?? (b as any).stage_order ?? 999999;
        return orderA - orderB;
      }),
    }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Topic</h3>
        <p className="text-sm text-muted-foreground">
          Choose the lesson content you'd like to use
        </p>
      </div>

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
            {sortedStages.length === 0 ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stage.topics.map((topic, index) => {
                      const isSelected = selectedTopic?.id === topic.id;
                      const isCompleted = completedTopicIds.has(topic.id);
                      const isRecommended = recommendedTopicIds.has(topic.id);

                      return (
                        <button
                          key={topic.id}
                          onClick={() => onTopicChange(topic)}
                          className="text-left"
                        >
                          <Card
                            className={`
                        h-full transition-all
                        ${
                          isSelected
                            ? "border-primary border-2 bg-primary/5"
                            : isRecommended
                              ? "border-amber-400 border-2 bg-amber-50/50"
                              : isCompleted
                                ? "border-border bg-green-50/30"
                                : "border-border hover:border-primary/50"
                        }
                      `}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <span className="text-sm font-medium text-muted-foreground shrink-0">
                                    {index + 1}.
                                  </span>
                                  <h4 className="font-semibold text-base leading-tight">
                                    {topic.title}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isRecommended && (
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white">
                                      <Star className="h-3 w-3 fill-white" />
                                    </div>
                                  )}
                                  {isCompleted && !isRecommended && (
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="text-primary text-lg">
                                      ✓
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary">
                                  {topic.slideCount} slides
                                </Badge>
                                {isRecommended && (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700 border-amber-300"
                                  >
                                    Recommended
                                  </Badge>
                                )}
                                {isCompleted && !isRecommended && (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-50 text-green-700 border-green-200"
                                  >
                                    Completed
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {topic.description}
                              </p>
                            </CardContent>
                          </Card>
                        </button>
                      );
                    })}
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
