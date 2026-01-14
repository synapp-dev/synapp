"use client";

import { useEffect, useRef } from "react";
import { useTopicSlidesCacheStore } from "@/stores/topic-slides-cache-store";
import { useTopicsStore } from "@/entities/topics/model/store-enhanced";
import type { SlideData } from "@/components/organisms/slide-renderer";

/**
 * Preloads images for upcoming slides into browser cache.
 * This ensures images are ready when the user navigates to the next slide.
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
  const getSlideUrl = useTopicSlidesCacheStore((state) => state.getSlideUrl);

  useEffect(() => {
    if (!enabled || slides.length === 0) return;

    // Preload images for upcoming slides
    const preloadPromises: Promise<void>[] = [];

    for (let i = 1; i <= lookAhead; i++) {
      const nextIndex = currentSlideIndex + i;
      if (nextIndex >= slides.length) break;

      const slide = slides[nextIndex];
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
            // Check new store first
            const topicsStoreState = useTopicsStore.getState();
            const newStoreUrl = topicsStoreState.slideUrls[slide.id];
            let url: string | null = null;

            if (newStoreUrl && Date.now() - newStoreUrl.timestamp < 7 * 24 * 60 * 60 * 1000) {
              url = newStoreUrl.url;
            } else {
              // Fall back to cache store
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

    // Also preload previous slide (in case user goes back)
    const prevIndex = currentSlideIndex - 1;
    if (prevIndex >= 0) {
      const slide = slides[prevIndex];
      if (
        slide.kind === "image" &&
        slide.id &&
        !slide.id.startsWith("temp_") &&
        slide.imageUrl &&
        !slide.imageUrl.startsWith("blob:") &&
        !preloadedRef.current.has(slide.id)
      ) {
        preloadedRef.current.add(slide.id);

        const urlPromise = (async () => {
          try {
            const topicsStoreState = useTopicsStore.getState();
            const newStoreUrl = topicsStoreState.slideUrls[slide.id];
            let url: string | null = null;

            if (newStoreUrl && Date.now() - newStoreUrl.timestamp < 7 * 24 * 60 * 60 * 1000) {
              url = newStoreUrl.url;
            } else {
              url = await getSlideUrl(slide.id);
            }

            if (url) {
              const img = new Image();
              img.src = url;
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                setTimeout(() => reject(new Error("Timeout")), 10000);
              });
            }
          } catch (error) {
            console.debug(`Failed to preload image for slide ${slide.id}:`, error);
          }
        })();

        preloadPromises.push(urlPromise);
      }
    }

    // Don't await - let preloading happen in background
    Promise.allSettled(preloadPromises);
  }, [slides, currentSlideIndex, enabled, lookAhead, getSlideUrl]);
}
