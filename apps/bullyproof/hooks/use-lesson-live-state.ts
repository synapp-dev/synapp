"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { SlideData } from "@/components/organisms/slide-renderer";
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
  const supabase = createBrowserClient();

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

        const { liveState: apiLiveState, slides: fetchedSlides } = result.data;

        if (!mounted) return;

        // Convert slides to SlideData format and ensure they're sorted by orderIndex
        const formattedSlides: SlideData[] = fetchedSlides
          .map((slide: any) => ({
            id: slide.topicSlideId,
            kind: slide.kind as SlideData["kind"],
            orderIndex: slide.orderIndex,
            textHtml: slide.textHtml,
            imageUrl: slide.imageUrl,
            videoUrl: slide.videoUrl,
            videoStartS: slide.videoStartS,
            videoEndS: slide.videoEndS,
            effectiveNotes: slide.effectiveNotes,
          }))
          .sort((a, b) => a.orderIndex - b.orderIndex);

        setSlides(formattedSlides);

        // Also query the database directly via Supabase to get the absolute latest state
        // This ensures we have the most up-to-date slide index on initial load
        const { data: latestLiveState, error: dbError } = await supabase
          .from("lesson_live_state")
          .select("*")
          .eq("lesson_id", actualLessonId)
          .single();

        if (!mounted) return;

        // Use the latest state from database (most recent), fallback to API state
        const liveState = latestLiveState || apiLiveState;

        // Set current slide index from live state - prioritize current_index from database
        if (liveState) {
          // First, try to use current_index directly (most reliable)
          if (
            liveState.current_index >= 0 &&
            liveState.current_index < formattedSlides.length
          ) {
            setCurrentSlideIndex(liveState.current_index);
          } else {
            // Fallback: find by slide ID if current_index is invalid
            const index = formattedSlides.findIndex(
              (s) => s.id === liveState.current_slide_id
            );
            if (index !== -1) {
              setCurrentSlideIndex(index);
            } else {
              // Last resort: start at first slide
              setCurrentSlideIndex(0);
            }
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
            // Find the slide index by current_slide_id
            const index = slides.findIndex(
              (s) => s.id === newState.current_slide_id
            );
            
            if (index !== -1) {
              return index;
            }
            
            // Fallback to current_index
            if (
              newState.current_index >= 0 &&
              newState.current_index < slides.length
            ) {
              return newState.current_index;
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

  // Update slide function
  const updateSlide = useCallback(
    async (index: number) => {
      if (index < 0 || index >= slides.length) {
        return;
      }

      const targetSlide = slides[index];
      if (!targetSlide) {
        return;
      }

      try {
        const result = await lessonsApi.liveState.post.update(actualLessonId, {
          currentSlideId: targetSlide.id,
          currentIndex: index,
        });

        if (result.error) {
          throw new Error(result.error.message || "Failed to update slide");
        }

        // The realtime subscription will handle the state update
        // But we can optimistically update if needed
        setCurrentSlideIndex(index);
      } catch (err: any) {
        console.error("Error updating slide:", err);
        setError(err.message || "Failed to update slide");
      }
    },
    [actualLessonId, slides]
  );

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

