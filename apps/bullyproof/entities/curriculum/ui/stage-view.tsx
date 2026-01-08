"use client";

import { useStageByCode, useStage } from "@/entities/stages/model/store";
import { useTopicsByStage } from "@/entities/topics/model/store-enhanced";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Loader2, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";

interface StageViewProps {
  stageId?: string;
  stageCode?: string;
  showTopics?: boolean;
  onTopicClick?: (topicId: string, stageOrder: number | null) => void;
  basePath?: string;
}

export function StageView({
  stageId,
  stageCode,
  showTopics = true,
  onTopicClick,
  basePath,
}: StageViewProps) {
  const router = useRouter();

  // Fetch stage by ID or code
  const stageByIdQuery = useStage(stageId || null);
  const stageByCodeQuery = useStageByCode(stageCode || null);
  
  const stageQuery = stageId ? stageByIdQuery : stageByCodeQuery;
  const { stage, isLoading: isLoadingStage, error: stageError } = stageQuery;

  // Fetch topics if stage is loaded and showTopics is true
  const {
    topics,
    isLoading: isLoadingTopics,
  } = useTopicsByStage(stage?.id, {
    includeSlides: true,
    includeUrls: true,
  });

  if (isLoadingStage) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading stage...</p>
        </div>
      </div>
    );
  }

  if (stageError || !stage) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p className="font-medium">Error loading stage</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stageError?.message || "Stage not found"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleTopicClick = (topicId: string, stageOrder: number | null) => {
    if (onTopicClick) {
      onTopicClick(topicId, stageOrder);
    } else if (basePath && stageOrder !== null && stageOrder !== undefined) {
      router.push(`${basePath}/${stage.code}/T${stageOrder}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {stage.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stage.years && stage.years.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Year Levels</h3>
              <div className="flex flex-wrap gap-2">
                {stage.years.map((year) => (
                  <Badge
                    key={year.id}
                    variant="outline"
                    className="text-xs"
                  >
                    {year.displayName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {showTopics && (
            <div>
              <h3 className="text-sm font-medium mb-2">
                Topics ({topics.length})
              </h3>
              {isLoadingTopics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : topics.length > 0 ? (
                <div className="space-y-2">
                  {topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleTopicClick(topic.id, topic.stageOrder)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{topic.title}</p>
                        </div>
                        {topic.slides && topic.slides.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {topic.slides.length} slide{topic.slides.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  No topics available for this stage.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
