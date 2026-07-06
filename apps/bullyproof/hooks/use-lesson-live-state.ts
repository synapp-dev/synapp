"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { SlideData } from "@/components/organisms/slide-renderer";
import { compareSlidesByPosition } from "@/lib/fractional-position";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { useLiveLessonStore } from "@/stores/live-lesson-store";

interface LiveState {
  lesson_id: string;
  current_slide_id: string;
  current_index: number;
  is_paused: boolean;
  updated_at: string;
  updated_by: string;
}

interface UseLessonLiveStateReturn {
  slides: SlideData[];
  currentSlideIndex: number;
  currentSlide: SlideData | null;
  updateSlide: (index: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useLessonLiveState(
  lessonId?: string
): UseLessonLiveStateReturn {
  // Use lessonId from props if provided, otherwise get from store
  const storeLessonId = useLiveLessonStore((s) => s.lessonId);
  const actualLessonId = lessonId || storeLessonId;
  
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Use useMemo to ensure stable reference (createBrowserClient is now a singleton)
  const supabase = useMemo(() => createBrowserClient(), []);
  const apiUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<{ slideId: string; index: number } | null>(null);

  // Fetch initial data and get latest live state from database
  useEffect(() => {
    if (!actualLessonId) {
      setIsLoading(false);
      setError("No lesson ID provided");
      return;
    }

    let mounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch slides and initial live state from API
        const result = await lessonsApi.liveState.get.byLessonId(actualLessonId);
        
        if (result.error) {
          throw new Error(result.error.message || "Failed to fetch lesson data");
        }

        if (!result.data) {
          throw new Error("No data returned from API");
        }

        const { liveState: apiLiveState, slides: fetchedSlides } = result.data;

        if (!mounted) return;

        // Ensure slides is an array
        if (!Array.isArray(fetchedSlides)) {
          console.warn("Expected slides to be an array, got:", fetchedSlides);
          setSlides([]);
          setCurrentSlideIndex(0);
          setIsLoading(false);
          return;
        }

        // Convert slides to SlideData format and ensure they're sorted by position
        const formattedSlides: SlideData[] = fetchedSlides
          .map((slide: any) => ({
            id: slide.topicSlideId,
            kind: slide.kind as SlideData["kind"],
            position: slide.position,
            textHtml: slide.textHtml,
            imageUrl: slide.imageUrl,
            videoUrl: slide.videoUrl,
            videoStartS: slide.videoStartS,
            videoEndS: slide.videoEndS,
            effectiveNotes: slide.effectiveNotes,
            signedUrl: slide.signedUrl ?? null,
            signedImageUrl: slide.signedImageUrl ?? slide.signedUrl ?? null,
          }))
          .sort(compareSlidesByPosition);

        setSlides(formattedSlides);

        // Also query the database directly via Supabase to get the absolute latest state
        // This ensures we have the most up-to-date slide index on initial load
        // Use maybeSingle() instead of single() to handle case where no row exists
        const { data: latestLiveState, error: dbError } = await supabase
          .from("lesson_live_state")
          .select("*")
          .eq("lesson_id", actualLessonId)
          .maybeSingle();

        if (!mounted) return;

        // Log database errors but don't fail - we can fallback to API state
        if (dbError && dbError.code !== 'PGRST116') {
          console.warn("Error fetching latest live state from database:", dbError);
        }

        // Use the latest state from database (most recent), fallback to API state
        const liveState = latestLiveState || apiLiveState;

        // Set current slide index from live state - prioritize current_index from database
        if (liveState) {
          // Handle both camelCase (from Drizzle API) and snake_case (from Supabase direct query) formats
          const currentIndex = 
            (liveState as any).currentIndex ?? 
            (liveState as any).current_index ?? 
            -1;
          const currentSlideId = 
            (liveState as any).currentSlideId ?? 
            (liveState as any).current_slide_id ?? 
            null;

          // First, try to use current_index directly (most reliable)
          if (
            currentIndex >= 0 &&
            currentIndex < formattedSlides.length
          ) {
            setCurrentSlideIndex(currentIndex);
          } else if (currentSlideId) {
            // Fallback: find by slide ID if current_index is invalid
            const index = formattedSlides.findIndex(
              (s) => s.id === currentSlideId
            );
            if (index !== -1) {
              setCurrentSlideIndex(index);
            } else {
              // Last resort: start at first slide
              setCurrentSlideIndex(0);
            }
          } else {
            // No valid index or slide ID - start at first slide
            setCurrentSlideIndex(0);
          }
        } else {
          // No live state exists - create initial state at slide 0
          // This will be handled by the updateLiveState function if needed
          setCurrentSlideIndex(0);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Failed to load lesson data");
          console.error("Error fetching lesson data:", err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [actualLessonId]);

  // Set up realtime subscription
  useEffect(() => {
    if (slides.length === 0) return;

    const channel = supabase
      .channel(`lesson:${actualLessonId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lesson_live_state",
          filter: `lesson_id=eq.${actualLessonId}`,
        },
        (payload) => {
          const newState = payload.new as LiveState;
          
          setCurrentSlideIndex((currentIndex) => {
            // Handle both camelCase and snake_case formats from realtime updates
            const slideId = 
              (newState as any).currentSlideId ?? 
              (newState as any).current_slide_id ?? 
              null;
            const indexValue = 
              (newState as any).currentIndex ?? 
              (newState as any).current_index ?? 
              -1;
            
            // First, try to find by slide ID
            if (slideId) {
              const index = slides.findIndex((s) => s.id === slideId);
              if (index !== -1) {
                return index;
              }
            }
            
            // Fallback to current_index
            if (
              indexValue >= 0 &&
              indexValue < slides.length
            ) {
              return indexValue;
            }
            
            return currentIndex;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [actualLessonId, slides, supabase]);

  // Update slide function - optimistically updates UI immediately, debounces API call
  const updateSlide = useCallback(
    async (index: number) => {
      if (index < 0 || index >= slides.length) {
        return;
      }

      const targetSlide = slides[index];
      if (!targetSlide) {
        return;
      }

      // Optimistically update UI immediately for instant feedback
      setCurrentSlideIndex(index);

      // Store the pending update
      pendingUpdateRef.current = {
        slideId: targetSlide.id,
        index: index,
      };

      // Clear any existing timeout
      if (apiUpdateTimeoutRef.current) {
        clearTimeout(apiUpdateTimeoutRef.current);
      }

      // Debounce the API call - only fire after user stops navigating for 2 seconds
      apiUpdateTimeoutRef.current = setTimeout(() => {
        const pending = pendingUpdateRef.current;
        if (pending) {
          // Fire API call in background without blocking UI
          lessonsApi.liveState.post.update(actualLessonId, {
            currentSlideId: pending.slideId,
            currentIndex: pending.index,
          }).catch((err: any) => {
            // Only log errors, don't revert UI - realtime subscription will sync if needed
            console.error("Error updating slide (non-blocking):", err);
          });
          
          // Clear pending update after sending
          pendingUpdateRef.current = null;
        }
        apiUpdateTimeoutRef.current = null;
      }, 2000); // 2 second debounce
    },
    [actualLessonId, slides]
  );

  // Cleanup timeout on unmount and send final update if pending
  useEffect(() => {
    return () => {
      if (apiUpdateTimeoutRef.current) {
        clearTimeout(apiUpdateTimeoutRef.current);
        apiUpdateTimeoutRef.current = null;
      }
      
      // Send final pending update immediately on unmount
      const pending = pendingUpdateRef.current;
      if (pending) {
        lessonsApi.liveState.post.update(actualLessonId, {
          currentSlideId: pending.slideId,
          currentIndex: pending.index,
        }).catch((err: any) => {
          console.error("Error sending final slide update:", err);
        });
        pendingUpdateRef.current = null;
      }
    };
  }, [actualLessonId]);

  const currentSlide = slides[currentSlideIndex] || null;

  return {
    slides,
    currentSlideIndex,
    currentSlide,
    updateSlide,
    isLoading,
    error,
  };
}

