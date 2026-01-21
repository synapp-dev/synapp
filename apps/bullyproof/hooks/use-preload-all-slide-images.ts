"use client";

import { useEffect, useRef } from "react";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";
import { useCertificationSlidesCacheStore } from "@/stores/certification-slides-cache-store";
import { useTopicsStore } from "@/entities/topics/model/store-enhanced";
import type { SlideData } from "@/components/organisms/slide-renderer";

/**
 * Preloads ALL slide images into browser cache.
 * This ensures images are ready instantly when navigating between slides.
 * 
 * @param slides - Array of all slides
 * @param enabled - Whether to enable preloading (defaults to true)
 * @param isCertification - Whether these are certification slides (defaults to false)
 */
export function usePreloadAllSlideImages(
  slides: SlideData[],
  enabled: boolean = true,
  isCertification: boolean = false
) {
  const preloadedRef = useRef<Set<string>>(new Set());
  const topicGetSlideUrl = useTopicSlidesCacheStore((state) => state.getSlideUrl);
  const certificationGetSlideUrl = useCertificationSlidesCacheStore((state) => state.getSlideUrl);
  const getSlideUrl = isCertification ? certificationGetSlideUrl : topicGetSlideUrl;

  useEffect(() => {
    if (!enabled || slides.length === 0) return;

    // Preload images for ALL image slides
    const preloadPromises: Promise<void>[] = [];

    for (const slide of slides) {
      if (
        slide.kind === "image" &&
        slide.id &&
        !slide.id.startsWith("temp_") &&
        slide.imageUrl &&
        !slide.imageUrl.startsWith("blob:") &&
        !preloadedRef.current.has(slide.id)
      ) {
        preloadedRef.current.add(slide.id);

        // Get the URL (from cache or fetch)
        const urlPromise = (async () => {
          try {
            let url: string | null = null;

            if (!isCertification) {
              // Check new store first (for curriculum topics)
              const topicsStoreState = useTopicsStore.getState();
              const newStoreUrl = topicsStoreState.slideUrls[slide.id];
              if (newStoreUrl && Date.now() - newStoreUrl.timestamp < 7 * 24 * 60 * 60 * 1000) {
                url = newStoreUrl.url;
              }
            }

            // Fall back to cache store if not found in new store
            if (!url) {
              url = await getSlideUrl(slide.id);
            }

            if (url) {
              // Actually preload the image into browser cache
              const img = new Image();
              img.src = url;
              // Wait for image to load
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                // Timeout after 10 seconds
                setTimeout(() => reject(new Error("Timeout")), 10000);
              });
            }
          } catch (error) {
            // Silently fail - preloading is best effort
            console.debug(`Failed to preload image for slide ${slide.id}:`, error);
          }
        })();

        preloadPromises.push(urlPromise);
      }
    }

    // Don't await - let preloading happen in background
    Promise.allSettled(preloadPromises);
  }, [slides, enabled, isCertification, getSlideUrl]);
}
