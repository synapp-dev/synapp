"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2, FileText, Image, Video } from "lucide-react";
import { compareSlidesByPosition } from "@/server/lib/fractional-position";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { topics, topicSlides } from "@/server/db/schema";
import { isVideoUrl, getVideoEmbedUrl, isVimeoUrl, isYouTubeUrl } from "@/utils/video";
import { toStorageUrl } from "@/utils/supabase/storage-url";
import { VimeoPlayer } from "@/components/organisms/vimeo-player";

type Topic = typeof topics.$inferSelect & {
  stage?: any;
  slides?: Array<typeof topicSlides.$inferSelect>;
};

interface TopicSlidesDrawerProps {
  topicId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TopicSlidesDrawer({
  topicId,
  open,
  onOpenChange,
}: TopicSlidesDrawerProps) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !topicId) {
      setTopic(null);
      setError(null);
      return;
    }

    const fetchTopic = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await topicsApi.get.byId(topicId);
        if (result.data) {
          setTopic(result.data);
        } else if (result.error) {
          setError(result.error.message ?? "Failed to fetch topic");
        }
      } catch (err) {
        console.error("Failed to fetch topic:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch topic details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopic();
  }, [open, topicId]);

  const getSlideIcon = (kind: string) => {
    switch (kind) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSlideBadgeVariant = (kind: string) => {
    switch (kind) {
      case "text":
        return "default" as const;
      case "image":
        return "secondary" as const;
      case "video":
        return "outline" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95vh] w-1/2 mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 flex flex-col"
      >
        <div className="p-4 pb-2 border-b">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-4 w-4" />
              {topic?.title || "Topic Slides"}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {topic?.stage?.name || "Loading..."}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading slides...
                </p>
              </div>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <p className="font-medium">Error loading slides</p>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                </div>
              </CardContent>
            </Card>
          ) : !topic ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <p className="font-medium">Topic not found</p>
                </div>
              </CardContent>
            </Card>
          ) : !topic.slides || topic.slides.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <p className="font-medium">None</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {[...topic.slides].sort(compareSlidesByPosition).map((slide, index) => (
                <Card key={slide.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {getSlideIcon(slide.kind)}
                        <span>Slide {index + 1}</span>
                      </CardTitle>
                      <Badge variant={getSlideBadgeVariant(slide.kind)}>
                        {slide.kind}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {slide.kind === "text" && slide.textHtml && (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: slide.textHtml }}
                      />
                    )}
                    {slide.kind === "image" && slide.imageUrl && (
                      <div className="space-y-2">
                        <img
                          src={toStorageUrl(slide.imageUrl) ?? slide.imageUrl}
                          alt={`Slide ${index + 1}`}
                          className="w-full rounded-md border"
                        />
                        {slide.officialNotes && (
                          <p className="text-sm text-muted-foreground">
                            {slide.officialNotes}
                          </p>
                        )}
                      </div>
                    )}
                    {slide.kind === "video" &&
                      slide.videoUrl &&
                      (() => {
                        const isVideo = isVideoUrl(slide.videoUrl);
                        const embedUrl = isVideo
                          ? getVideoEmbedUrl(
                              slide.videoUrl,
                              slide.videoStartS ?? null,
                              slide.videoEndS ?? null
                            )
                          : null;

                        return (
                          <div className="space-y-2">
                            <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
                              {isVimeoUrl(slide.videoUrl) ? (
                                <VimeoPlayer
                                  videoUrl={slide.videoUrl}
                                  startTime={slide.videoStartS ?? undefined}
                                  endTime={slide.videoEndS ?? undefined}
                                  className="w-full h-full"
                                />
                              ) : isYouTubeUrl(slide.videoUrl) && embedUrl ? (
                                <iframe
                                  src={embedUrl}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title={`Video content for slide ${index + 1}`}
                                />
                              ) : (
                                <video
                                  src={slide.videoUrl}
                                  controls
                                  className="w-full h-full"
                                />
                              )}
                            </div>
                            {(slide.videoStartS !== null ||
                              slide.videoEndS !== null) && (
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {slide.videoStartS !== null && (
                                  <span>Start: {slide.videoStartS}s</span>
                                )}
                                {slide.videoEndS !== null && (
                                  <span>End: {slide.videoEndS}s</span>
                                )}
                              </div>
                            )}
                            {slide.officialNotes && (
                              <p className="text-sm text-muted-foreground">
                                {slide.officialNotes}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    {slide.durationSec !== null && (
                      <div className="text-xs text-muted-foreground">
                        Duration: {slide.durationSec}s
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
