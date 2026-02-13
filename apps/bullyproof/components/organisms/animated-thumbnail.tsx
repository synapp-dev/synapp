"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FileText } from "lucide-react";

export type TopicSlide = {
  id: string;
  orderIndex: number;
  kind: string;
  imageUrl?: string | null;
  signedUrl?: string | null;
  topicId?: string; // Optional for compatibility
  videoUrl?: string | null; // Optional for compatibility
  textHtml?: string | null; // Optional for compatibility
};

interface AnimatedThumbnailProps {
  imageSlidesList: TopicSlide[];
  topicTitle: string;
  cardIndex?: number;
  isPaused?: boolean;
  isCertification?: boolean;
}

export function AnimatedThumbnail({
  imageSlidesList,
  topicTitle,
  cardIndex = 0,
  isPaused = false,
  isCertification = false,
}: AnimatedThumbnailProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isMountedRef = useRef(true);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-fetch URLs for current and next slides
  const currentSlide = imageSlidesList[currentIndex];
  const nextIndex = (currentIndex + 1) % imageSlidesList.length;
  const nextSlide = imageSlidesList[nextIndex];

  // Get URLs directly from slide data (signedUrl comes from API / DB cache)
  const currentUrl = currentSlide?.signedUrl || null;
  const nextUrl = nextSlide?.signedUrl || null;

  // Clear all timers helper
  const clearAllTimers = () => {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  };

  // Track paused state with ref to avoid triggering re-renders
  const isPausedRef = useRef(isPaused);
  const prevIsPausedRef = useRef(isPaused);

  // Update ref when paused state changes, but don't trigger effect
  useEffect(() => {
    isPausedRef.current = isPaused;
    // If paused, clear timers immediately without state updates
    if (isPaused) {
      if (hoverAdvanceTimeoutRef.current) {
        clearTimeout(hoverAdvanceTimeoutRef.current);
        hoverAdvanceTimeoutRef.current = null;
      }
      clearAllTimers();
    }
  }, [isPaused]);

  // Advance one slide with proper transition when hover starts (isPaused: true -> false)
  useEffect(() => {
    if (prevIsPausedRef.current && !isPaused && imageSlidesList.length > 1) {
      setIsTransitioning(true);
      hoverAdvanceTimeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % imageSlidesList.length);
        setIsTransitioning(false);
        hoverAdvanceTimeoutRef.current = null;
      }, 1200);
    }
    prevIsPausedRef.current = isPaused;
  }, [isPaused, imageSlidesList.length]);

  // Animate through image slides with offset timing
  // When isPaused becomes false (e.g. on hover), effect re-runs and starts animation
  useEffect(() => {
    isMountedRef.current = true;

    // Don't start animation if paused
    if (isPausedRef.current) {
      return;
    }

    if (imageSlidesList.length <= 1) {
      return;
    }

    // Clear any existing timers before starting new ones
    clearAllTimers();

    // Offset each card by its index to desync animations
    const offsetDelay = cardIndex * 400; // 400ms offset per card

    startTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current || isPausedRef.current) return;

      intervalRef.current = setInterval(() => {
        if (!isMountedRef.current || isPausedRef.current) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        setIsTransitioning(true);

        // Clear any existing transition timeout
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }

        transitionTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current || isPausedRef.current) {
            transitionTimeoutRef.current = null;
            return;
          }
          setCurrentIndex((prev) => (prev + 1) % imageSlidesList.length);
          setIsTransitioning(false);
          transitionTimeoutRef.current = null;
        }, 1200); // Match transition duration (doubled from 600ms)
      }, 5000); // Change every 5 seconds
    }, offsetDelay);

    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [imageSlidesList.length, cardIndex, isPaused]);

  if (!currentSlide || !currentUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Current image - slides up and out when transitioning */}
      <div
        key={`current-${currentSlide.id}`}
        className={`absolute inset-0 transition-transform duration-[1200ms] ease-in-out ${
          isTransitioning ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <Image
          src={currentUrl}
          alt={`${topicTitle} - Slide ${currentSlide.orderIndex + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>
      {/* Next image - slides up from bottom */}
      {nextSlide && nextUrl && (
        <div
          key={`next-${nextSlide.id}`}
          className={`absolute inset-0 transition-transform duration-[1200ms] ease-in-out ${
            isTransitioning ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <Image
            src={nextUrl}
            alt={`${topicTitle} - Slide ${nextSlide.orderIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
      )}
    </>
  );
}
