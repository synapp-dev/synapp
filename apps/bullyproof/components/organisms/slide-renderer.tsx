"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";
import { useCertificationSlidesCacheStore } from "@/stores/certification-slides-cache-store";
import { useTopicsStore } from "@/entities/topics/model/store-enhanced";
import {
  isYouTubeUrl,
  isVimeoUrl,
  isVideoUrl,
  getVideoEmbedUrl,
  getVideoThumbnailUrl,
  getYouTubeThumbnailUrl,
} from "@/utils/video";
import { VimeoPlayer } from "./vimeo-player";
import type { QuizData } from "./quiz-slide-editor";

export type SlideKind = "text" | "image" | "video" | "quiz" | "test";

export interface SlideData {
  id: string;
  kind: SlideKind;
  orderIndex: number;
  textHtml?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videoStartS?: number | null;
  videoEndS?: number | null;
  effectiveNotes?: string | null;
  quizData?: QuizData | null;
}

interface SlideRendererProps {
  slide: SlideData;
  className?: string;
  // Optional prop to force refresh the URL (useful after upload)
  forceRefresh?: boolean;
  // If true, shows thumbnail/preview only (no controls, no playback) - useful for galleries
  thumbnailOnly?: boolean;
  // If true, uses certification slides cache store instead of topic slides cache store
  isCertification?: boolean;
}

export function SlideRenderer({
  slide,
  className,
  forceRefresh = false,
  thumbnailOnly = false,
  isCertification = false,
}: SlideRendererProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Use appropriate cache store based on context
  const topicGetSlideUrl = useTopicSlidesCacheStore(
    (state) => state.getSlideUrl
  );
  const certificationGetSlideUrl = useCertificationSlidesCacheStore(
    (state) => state.getSlideUrl
  );
  const getSlideUrl = isCertification
    ? certificationGetSlideUrl
    : topicGetSlideUrl;

  // Subscribe to cache changes for this specific slide
  // Check new store first (from API responses with includeUrls)
  const newStoreCachedUrl = useTopicsStore(
    (state) => (!isCertification ? state.slideUrls[slide.id]?.url ?? null : null)
  );
  const topicCachedUrl = useTopicSlidesCacheStore(
    (state) => state.cache[slide.id]?.url ?? null
  );
  const certificationCachedUrl = useCertificationSlidesCacheStore(
    (state) => state.cache[slide.id]?.url ?? null
  );
  // Prefer new store URL if available, otherwise fall back to old store
  const cachedUrl = isCertification 
    ? certificationCachedUrl 
    : (newStoreCachedUrl || topicCachedUrl);

  const topicLoading = useTopicSlidesCacheStore(
    (state) => state.loading[slide.id] ?? false
  );
  const certificationLoading = useCertificationSlidesCacheStore(
    (state) => state.loading[slide.id] ?? false
  );
  const loading = isCertification ? certificationLoading : topicLoading;

  const topicError = useTopicSlidesCacheStore(
    (state) => state.errors[slide.id] ?? null
  );
  const certificationError = useCertificationSlidesCacheStore(
    (state) => state.errors[slide.id] ?? null
  );
  const error = isCertification ? certificationError : topicError;

  // Fetch signed URL for image slides using cache
  useEffect(() => {
    if (slide.kind === "image" && slide.id) {
      // Skip fetching for temp slides (new slides not yet saved)
      // Also skip if imageUrl is already a blob URL (preview from file upload)
      if (slide.id.startsWith("temp_") || slide.imageUrl?.startsWith("blob:")) {
        // Use the blob URL directly or set to null for temp slides
        setImageUrl(slide.imageUrl || null);
        return;
      }

      // Only fetch signed URL for existing slides with actual image URLs
      if (slide.imageUrl && !slide.imageUrl.startsWith("blob:")) {
        // Check new store first (from API responses with includeUrls)
        if (!isCertification && !forceRefresh) {
          const topicsStoreState = useTopicsStore.getState();
          const newStoreUrl = topicsStoreState.slideUrls[slide.id];
          if (newStoreUrl && Date.now() - newStoreUrl.timestamp < 7 * 24 * 60 * 60 * 1000) {
            setImageUrl(newStoreUrl.url);
            // Also populate old store for consistency
            if (!topicCachedUrl) {
              useTopicSlidesCacheStore.getState().setSlideUrl(slide.id, newStoreUrl.url);
            }
            return;
          }
        }

        // Fall back to old cache store if not in new store
        let cancelled = false;
        getSlideUrl(slide.id, forceRefresh).then((url) => {
          if (!cancelled) {
            setImageUrl(url);
          }
        });

        return () => {
          cancelled = true;
        };
      } else {
        // No image URL, show placeholder
        setImageUrl(null);
      }
    } else {
      // Reset state for non-image slides
      setImageUrl(null);
    }
  }, [slide.kind, slide.id, slide.imageUrl, getSlideUrl, forceRefresh]);

  // Also update immediately when cached URL changes (for instant updates after cache updates)
  useEffect(() => {
    // Skip for temp slides or blob URLs
    if (
      slide.kind === "image" &&
      slide.id &&
      !slide.id.startsWith("temp_") &&
      !slide.imageUrl?.startsWith("blob:") &&
      cachedUrl &&
      !loading
    ) {
      setImageUrl(cachedUrl);
    }
  }, [slide.kind, slide.id, slide.imageUrl, cachedUrl, loading]);

  // Determine if video URL is YouTube or Vimeo and convert to embed URL if needed
  const videoEmbedUrl = useMemo(() => {
    if (slide.kind !== "video" || !slide.videoUrl) {
      return null;
    }

    if (isVideoUrl(slide.videoUrl)) {
      return getVideoEmbedUrl(
        slide.videoUrl,
        slide.videoStartS,
        slide.videoEndS,
        true // Hide YouTube controls for cleaner video playback (only applies to YouTube)
      );
    }

    return null; // Not YouTube or Vimeo, will use video tag
  }, [slide.kind, slide.videoUrl, slide.videoStartS, slide.videoEndS]);

  const renderContent = () => {
    switch (slide.kind) {
      case "text":
        return (
          <div
            className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground"
            dangerouslySetInnerHTML={{
              __html: slide.textHtml || "<p>No content</p>",
            }}
          />
        );

      case "image":
        // Check if this is a temp slide or has no image URL
        const isTempSlide = slide.id.startsWith("temp_");
        const hasImageUrl =
          slide.imageUrl && !slide.imageUrl.startsWith("blob:")
            ? imageUrl
            : slide.imageUrl;

        return (
          <div className="flex items-center justify-center h-full w-full">
            {!isTempSlide && loading ? (
              <div className="flex items-center justify-center">
                <img
                  src="/images/bp-small-logo.svg"
                  alt="Loading"
                  className={`${thumbnailOnly ? "h-8" : "h-16"} w-auto animate-pulse`}
                />
              </div>
            ) : !isTempSlide && error ? (
              <div className="text-destructive">Error: {error}</div>
            ) : hasImageUrl ? (
              <img
                src={hasImageUrl}
                alt="Slide content"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
                <svg
                  className="w-12 h-12 text-muted-foreground/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-muted-foreground font-medium">
                  {isTempSlide ? "Provide an image" : "No image uploaded"}
                </p>
              </div>
            )}
          </div>
        );

      case "video":
        if (!slide.videoUrl) {
          return (
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-foreground">No video available</div>
            </div>
          );
        }

        // If thumbnailOnly is true, show thumbnail/preview instead of player
        if (thumbnailOnly) {
          // For YouTube videos, use YouTube thumbnail API
          if (isYouTubeUrl(slide.videoUrl)) {
            const thumbnailUrl = getYouTubeThumbnailUrl(
              slide.videoUrl,
              "hqdefault"
            );
            if (thumbnailUrl) {
              return (
                <div className="flex items-center justify-center h-full w-full relative">
                  <img
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors rounded-lg">
                    <div className="bg-black/60 rounded-full p-3 backdrop-blur-sm">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            }
          }

          // For Vimeo videos, use VimeoPlayer for thumbnail
          if (isVimeoUrl(slide.videoUrl)) {
            return (
              <div className="flex items-center justify-center h-full w-full relative">
                <VimeoPlayer
                  videoUrl={slide.videoUrl}
                  className="w-full h-full object-cover rounded-lg shadow-lg pointer-events-none"
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors rounded-lg pointer-events-none z-10">
                  <div className="bg-black/60 rounded-full p-3 backdrop-blur-sm">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          }

          // For regular video files, show first frame with play button overlay
          return (
            <div className="flex items-center justify-center h-full w-full relative">
              <video
                src={slide.videoUrl}
                preload="metadata"
                className="w-full h-full object-cover rounded-lg shadow-lg pointer-events-none"
                muted
                playsInline
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors rounded-lg pointer-events-none">
                <div className="bg-black/60 rounded-full p-3 backdrop-blur-sm">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          );
        }

        // Use iframe for YouTube videos, VimeoPlayer component for Vimeo videos
        if (isVimeoUrl(slide.videoUrl)) {
          return (
            <div className="flex items-center justify-center h-full w-full">
              <VimeoPlayer
                videoUrl={slide.videoUrl}
                startTime={slide.videoStartS ?? undefined}
                endTime={slide.videoEndS ?? undefined}
                className="w-full h-full rounded-lg shadow-lg"
              />
            </div>
          );
        }

        if (isYouTubeUrl(slide.videoUrl) && videoEmbedUrl) {
          return (
            <div className="flex items-center justify-center h-full w-full">
              <iframe
                src={videoEmbedUrl}
                className="w-full h-full rounded-lg shadow-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video content"
              />
            </div>
          );
        }

        // Use video tag for regular video files (full player)
        return (
          <div className="flex items-center justify-center h-full w-full">
            <video
              src={slide.videoUrl}
              controls
              className="max-w-full max-h-full rounded-lg shadow-lg"
            />
          </div>
        );

      case "quiz":
        // Quiz slides are rendered as text with quiz data formatted as HTML
        // This is handled by converting quiz to text in the component using SlideRenderer
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className="text-foreground">Quiz slide</div>
          </div>
        );

      case "test":
        return (
          <div className="flex items-center justify-center h-full w-full">
            <div className="text-foreground">Test slide</div>
          </div>
        );

      default:
        return <div className="text-foreground">Unknown slide type</div>;
    }
  };

  return (
    <div className={cn("w-full h-full", className)}>{renderContent()}</div>
  );
}
