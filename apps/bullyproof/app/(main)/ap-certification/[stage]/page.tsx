"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type {
  certificationStages,
  certificationTopics,
} from "@/server/db/schema";
import { Progress } from "@workspace/ui/components/progress";

type Stage = typeof certificationStages.$inferSelect & {
  topicCount?: number;
};

type Topic = typeof certificationTopics.$inferSelect;

type TopicProgress = {
  id: string;
  topicId: string;
  status: string;
  scorePercentage: number | null;
  slideProgress: Record<string, any>;
  attemptNumber: number;
};

// Helper function to create a URL-friendly slug from a title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
}

export default function APCertificationStagePage() {
  const params = useParams();
  const stageCode = params?.stage as string;
  usePageTitle(["ap-certification", stageCode]);

  const [stage, setStage] = useState<Stage | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicProgress, setTopicProgress] = useState<
    Map<string, TopicProgress>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStage = async () => {
      if (!stageCode) return;

      try {
        setIsLoading(true);
        setError(null);

        const result = await certificationApi.stages.byCode(stageCode);
        if (!result.data) {
          setError(
            result.error?.message ?? "Failed to fetch certification stage"
          );
          return;
        }

        setStage(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStage();
  }, [stageCode]);

  useEffect(() => {
    const fetchTopics = async () => {
      if (!stageCode) return;

      try {
        setIsLoadingTopics(true);
        const result = await certificationApi.topics.byStageCode(stageCode);
        if (result.data) {
          setTopics(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch topics:", err);
      } finally {
        setIsLoadingTopics(false);
      }
    };

    fetchTopics();
  }, [stageCode]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!stageCode) return;

      try {
        setIsLoadingProgress(true);
        const result = await certificationApi.stages.progress.byCode(stageCode);
        if (result.data?.progress) {
          // Create a map of topicId -> progress for easy lookup
          const progressMap = new Map<string, TopicProgress>();
          result.data.progress.forEach((progress: TopicProgress) => {
            progressMap.set(progress.topicId, progress);
          });
          setTopicProgress(progressMap);
        }
      } catch (err) {
        console.error("Failed to fetch progress:", err);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    fetchProgress();
  }, [stageCode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Stage not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{stage.name}</h2>
        <p className="text-muted-foreground">
          Certification stage: {stage.code}
        </p>
      </div>

      {/* Topics List */}
      <div className="space-y-8">
        {/* <div>
          <h3 className="text-lg font-semibold tracking-tight">Topics</h3>
          <p className="text-sm text-muted-foreground">
            Topics for this certification stage, ordered by sequence.
          </p>
        </div> */}

        {isLoadingTopics ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : topics.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                No topics found for this certification stage.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {topics.map((topic, index) => {
              const topicOrder = topic.stageOrder ?? index + 1;
              const topicSlug = createSlug(topic.title);
              const topicHref = `/ap-certification/${stageCode}/${topicSlug}`;
              const progress = topicProgress.get(topic.id);

              // Calculate completion percentage from slideProgress
              let completionPercentage = 0;
              if (progress?.slideProgress) {
                const slideProgressData = progress.slideProgress as Record<
                  string,
                  any
                >;
                const slideIds = Object.keys(slideProgressData);
                if (slideIds.length > 0) {
                  const completedSlides = slideIds.filter(
                    (slideId) =>
                      slideProgressData[slideId]?.viewed ||
                      slideProgressData[slideId]?.answered
                  ).length;
                  completionPercentage = Math.round(
                    (completedSlides / slideIds.length) * 100
                  );
                }
              }

              // Determine status badge
              const getStatusBadge = () => {
                if (!progress) {
                  return <Badge variant="outline">Not Started</Badge>;
                }

                const status = progress.status;
                if (status === "completed" || status === "passed") {
                  return (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  );
                }
                if (status === "failed") {
                  return <Badge variant="destructive">Failed</Badge>;
                }
                if (status === "in_progress") {
                  return <Badge variant="secondary">In Progress</Badge>;
                }
                return <Badge variant="outline">Started</Badge>;
              };

              return (
                <Link key={topic.id} href={topicHref}>
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              {topicOrder}.
                            </span>
                            <CardTitle className="text-base">
                              {topic.title}
                            </CardTitle>
                          </div>
                          {topic.officialNotes && (
                            <CardDescription className="mt-1">
                              {topic.officialNotes}
                            </CardDescription>
                          )}

                          {/* Progress Bar */}
                          {progress && (
                            <div className="space-y-1 pt-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span>{completionPercentage}%</span>
                              </div>
                              <Progress
                                value={completionPercentage}
                                className="h-2"
                              />
                              {progress.scorePercentage !== null && (
                                <div className="text-xs text-muted-foreground">
                                  Score: {progress.scorePercentage}%
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge()}
                          {progress && (
                            <span className="text-xs text-muted-foreground">
                              Attempt {progress.attemptNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
