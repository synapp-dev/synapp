"use client";

import { useEffect, useRef } from "react";
import type { SlideData } from "@/components/organisms/slide-renderer";
import { toStorageUrl } from "@/utils/supabase/storage-url";

/**
 * Preloads ALL slide images into browser cache.
 * This ensures images are ready instantly when navigating between slides.
 * Uses the signedUrl from the API response (DB-cached) directly.
 * 
 * @param slides - Array of all slides
 * @param enabled - Whether to enable preloading (defaults to true)
 * @param isCertification - Whether these are certification slides (unused, kept for compat)
 */
export function usePreloadAllSlideImages(
  slides: SlideData[],
  enabled: boolean = true,
  isCertification: boolean = false
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
}
