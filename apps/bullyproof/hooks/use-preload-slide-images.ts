"use client";

import { useEffect, useRef } from "react";
import type { SlideData } from "@/components/organisms/slide-renderer";
import { toStorageUrl } from "@/utils/supabase/storage-url";

/**
 * Preloads images for upcoming slides into browser cache.
 * This ensures images are ready when the user navigates to the next slide.
 * Uses the signedUrl from the API response (DB-cached) directly.
 * 
 * @param slides - Array of all slides
 * @param currentSlideIndex - Current slide index
 * @param enabled - Whether to enable preloading (defaults to true)
 * @param lookAhead - Number of slides ahead to preload (defaults to 2)
 */
export function usePreloadSlideImages(
  slides: SlideData[],
  currentSlideIndex: number,
  enabled: boolean = true,
  lookAhead: number = 2
) {
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || slides.length === 0) return;

    const indicesToPreload: number[] = [];

    // Preload upcoming slides
    for (let i = 1; i <= lookAhead; i++) {
      const nextIndex = currentSlideIndex + i;
      if (nextIndex < slides.length) {
        indicesToPreload.push(nextIndex);
      }
    }

    // Also preload previous slide (in case user goes back)
    const prevIndex = currentSlideIndex - 1;
    if (prevIndex >= 0) {
      indicesToPreload.push(prevIndex);
    }

    for (const idx of indicesToPreload) {
      const slide = slides[idx];
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
  }, [slides, currentSlideIndex, enabled, lookAhead]);
}
