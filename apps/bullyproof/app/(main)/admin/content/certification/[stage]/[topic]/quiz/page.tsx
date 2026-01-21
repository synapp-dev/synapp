"use client";

import { useEffect, useState } from "react";
import { PlatformAdminGuard } from "@/components/molecules/platform-admin-guard";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { QuizGridSection } from "@/entities/certification/ui/quiz-grid-section";
import { certificationApi } from "@/entities/certification/api/endpoints";

export default function CertificationTopicQuizPage() {
  const params = useParams();
  const stageCode = params?.stage as string;
  const topicSlug = params?.topic as string;
  const [topicId, setTopicId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopic = async () => {
      if (!stageCode || !topicSlug) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch topic by slug
        const topicResult = await certificationApi.topics.bySlug(
          stageCode,
          topicSlug
        );

        if (!topicResult.data) {
          setError(
            topicResult.error?.message ?? "Topic not found"
          );
          return;
        }

        setTopicId(topicResult.data.id);
      } catch (err) {
        console.error("Failed to fetch topic:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch topic");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopic();
  }, [stageCode, topicSlug]);

  if (isLoading) {
    return (
      <>
        <PlatformAdminGuard />
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (error || !topicId) {
    return (
      <>
        <PlatformAdminGuard />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {error || "Topic not found"}
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PlatformAdminGuard />
      <QuizGridSection topicId={topicId} />
    </>
  );
}
