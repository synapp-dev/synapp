"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { TopicDetailSection } from "@/entities/dashboard/ui/admin/sections/content/topic-detail-section";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { certificationTopics } from "@/server/db/schema";

export default function CertificationTopicPage() {
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

        // Parse topic order from slug (e.g., "T1" -> 1)
        const topicOrderMatch = topicSlug.match(/^T(\d+)$/);
        if (!topicOrderMatch) {
          setError("Invalid topic slug format. Expected format: T1, T2, etc.");
          return;
        }

        const topicOrder = parseInt(topicOrderMatch[1], 10);

        // Fetch all topics for this stage
        const topicsResult =
          await certificationApi.topics.byStageCode(stageCode);
        if (!topicsResult.data) {
          setError(topicsResult.error?.message ?? "Failed to fetch topics");
          return;
        }

        // Find the topic with matching stageOrder
        // Sort by stageOrder to ensure we get the correct one
        const sortedTopics = [...topicsResult.data].sort((a, b) => {
          const orderA = a.stageOrder ?? 0;
          const orderB = b.stageOrder ?? 0;
          return orderA - orderB;
        });

        // Find topic with matching stageOrder (lowest index matching the order)
        const foundTopic = sortedTopics.find(
          (t) => (t.stageOrder ?? 0) === topicOrder
        );

        if (!foundTopic) {
          setError(`Topic with order ${topicOrder} not found`);
          return;
        }

        setTopicId(foundTopic.id);
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !topicId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            {error || "Topic not found"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TopicDetailSection
      context="certification"
      topicId={topicId}
      stageCode={stageCode}
    />
  );
}
