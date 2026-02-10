"use client";

import { useEffect, useRef } from "react";
import type { SlideData } from "@/components/organisms/slide-renderer";
import { toStorageUrl } from "@/utils/supabase/storage-url";

/**
 * Pre-fetches all image URLs for topic slides in the background.
 * Since slides now come with signedUrl from the API (DB-cached),
 * this simply preloads the images into the browser cache.
 * 
 * @param slides - Array of slides to pre-fetch images for
 * @param enabled - Whether to enable the pre-fetching (defaults to true)
 */
export function usePrefetchTopicImages(
  slides: SlideData[],
  enabled: boolean = true
) {
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || slides.length === 0) return;

    for (const slide of slides) {
      if (
        slide.kind === "image" &&
        slide.id &&
        !slide.id.startsWith("temp_") &&
        !preloadedRef.current.has(slide.id)
      ) {
        const url = slide.signedUrl || slide.signedImageUrl;
        if (!url) continue;

        preloadedRef.current.add(slide.id);

        const resolvedUrl = toStorageUrl(url) ?? url;
        const img = new Image();
        img.src = resolvedUrl;
      }
    }
  }, [slides, enabled]);

  const imageSlideCount = slides.filter(
    (s) => s.kind === "image" && s.id && !s.id.startsWith("temp_")
  ).length;

  return {
    isLoading: false,
    isError: false,
    imageSlideCount,
  };
}
