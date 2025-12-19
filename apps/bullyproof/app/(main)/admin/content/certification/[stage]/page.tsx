"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2 } from "lucide-react";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type {
  certificationStages,
  certificationTopics,
} from "@/server/db/schema";

type Stage = typeof certificationStages.$inferSelect & {
  topicCount?: number;
};

type Topic = typeof certificationTopics.$inferSelect;

export default function CertificationStagePage() {
  const params = useParams();
  const stageCode = params?.stage as string;
  const [stage, setStage] = useState<Stage | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
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
        <p className="text-muted-foreground">Certification stage details</p>
      </div>

      {/* Topics List */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Topics</h3>
          <p className="text-sm text-muted-foreground">
            Topics for this certification stage, ordered by sequence.
          </p>
        </div>

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
          <div className="space-y-2">
            {topics.map((topic, index) => {
              const topicOrder = topic.stageOrder ?? index + 1;
              return (
                <Link
                  key={topic.id}
                  href={`/admin/content/certification/${stageCode}/T${topicOrder}`}
                >
                  <Card className="transition-shadow hover:shadow-md cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
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
                        </div>
                        <Badge variant="outline">{topic.status}</Badge>
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
