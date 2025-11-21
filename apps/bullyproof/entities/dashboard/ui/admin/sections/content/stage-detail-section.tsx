"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { curriculumStages, topics } from "@/server/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Loader2, ArrowLeft, BookOpen, FileText } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { TopicSlidesDrawer } from "./topic-slides-drawer";

type Stage = typeof curriculumStages.$inferSelect & {
  years?: Array<{
    id: string;
    code: string;
    displayName: string;
    sortIndex: number;
    level: {
      id: string;
      name: string;
      key: string;
    };
  }>;
};

type Topic = typeof topics.$inferSelect;

interface StageDetailSectionProps {
  slug: string;
}

export function StageDetailSection({ slug }: StageDetailSectionProps) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchStage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await curriculumApi.stages.byCode(slug);
        if (result.data) {
          setStage(result.data);
        } else if (result.error) {
          setError(
            result.error.message ?? "Failed to fetch curriculum stage details"
          );
        }
      } catch (err) {
        console.error("Failed to fetch curriculum stage:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch curriculum stage details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchStage();
  }, [slug]);

  useEffect(() => {
    if (!stage?.id) return;

    const fetchTopics = async () => {
      try {
        setIsLoadingTopics(true);
        const result = await topicsApi.get.list({ stageId: stage.id });
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
  }, [stage?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading curriculum stage...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/content")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stages
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p className="font-medium">Error loading curriculum stage</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/content")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stages
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="font-medium">Stage not found</p>
              <p className="text-sm mt-2">
                The curriculum stage you're looking for doesn't exist.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push("/admin/content")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Stages
      </Button>

      {/* Stage Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{stage.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            {stage.code}
          </Badge>
          {stage.sortIndex !== null && (
            <Badge variant="outline">Order: {stage.sortIndex}</Badge>
          )}
        </div>
      </div>

      {/* Stage Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Stage Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Code</p>
              <p className="text-base font-mono">{stage.code}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-base">{stage.name}</p>
            </div>
            {stage.sortIndex !== null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Sort Order
                </p>
                <p className="text-base">{stage.sortIndex}</p>
              </div>
            )}
            {stage.createdAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Created
                </p>
                <p className="text-base">
                  {new Date(stage.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Years Card */}
        {stage.years && stage.years.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Linked School Years</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stage.years.map((year) => (
                  <div
                    key={year.id}
                    className="flex items-center justify-between p-2 rounded-md border"
                  >
                    <div>
                      <p className="font-medium">{year.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {year.level.name} • {year.code}
                      </p>
                    </div>
                    <Badge variant="outline">{year.code}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Topics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTopics ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No topics found for this stage.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedTopicId(topic.id);
                    setIsDrawerOpen(true);
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {topic.stageOrder !== null && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {topic.stageOrder}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{topic.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {topic.status && (
                      <Badge
                        variant={
                          topic.status === "published"
                            ? "default"
                            : topic.status === "draft"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {topic.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topic Slides Drawer */}
      <TopicSlidesDrawer
        topicId={selectedTopicId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}
