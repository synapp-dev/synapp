"use client";

import { useEffect, useState } from "react";
import { PlatformAdminGuard } from "@/components/molecules/platform-admin-guard";
import { useParams, useRouter } from "next/navigation";
import { Loader2, FileText, FileQuestion, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { courseTopics } from "@/server/db/schema";
import { EditTopicSettingsDrawer } from "@/entities/certification/ui/edit-topic-settings-drawer";

type Topic = typeof courseTopics.$inferSelect;

export default function CertificationTopicPage() {
  const params = useParams();
  const router = useRouter();
  const stageCode = params?.stage as string;
  const topicSlug = params?.topic as string;
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

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

        setTopic(topicResult.data);
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

  if (error || !topic) {
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

  const handleNavigateToSlides = () => {
    router.push(`/admin/content/certification/${stageCode}/${topicSlug}/slides`);
  };

  const handleNavigateToQuiz = () => {
    router.push(`/admin/content/certification/${stageCode}/${topicSlug}/quiz`);
  };

  return (
    <>
      <PlatformAdminGuard />
      <div className="container mx-auto py-8 max-w-4xl">
      {/* Topic Header */}
      {topic && (
        <div className="flex items-center justify-between pb-6 border-b mb-6">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" />
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setIsEditDrawerOpen(true)}
            >
              <h1 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">
                {topic.title}
              </h1>
              <Pencil className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="space-y-6 pt-6">
          <p className="text-sm text-muted-foreground">
            Choose how you want to manage this topic's content:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleNavigateToSlides}
              variant="outline"
              className="h-auto p-6 flex flex-col items-start gap-3 hover:bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold">Slides</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Manage image and video slides for this topic
              </p>
            </Button>

            <Button
              onClick={handleNavigateToQuiz}
              variant="outline"
              className="h-auto p-6 flex flex-col items-start gap-3 hover:bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <FileQuestion className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold">Quiz</span>
              </div>
              <p className="text-sm text-muted-foreground text-left">
                Manage quiz questions and answers for this topic
              </p>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Topic Settings Drawer */}
      {topic && (
        <EditTopicSettingsDrawer
          open={isEditDrawerOpen}
          onOpenChange={setIsEditDrawerOpen}
          topic={topic}
          onTopicUpdated={() => {
            // Reload topic data
            const reloadTopic = async () => {
              const topicResult = await certificationApi.topics.bySlug(
                stageCode,
                topicSlug
              );
              if (topicResult.data) {
                setTopic(topicResult.data);
              }
            };
            reloadTopic();
          }}
        />
      )}
    </div>
    </>
  );
}
