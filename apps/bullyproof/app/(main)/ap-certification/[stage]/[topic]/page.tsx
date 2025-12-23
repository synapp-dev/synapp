"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type {
  certificationTopics,
  certificationSlides,
} from "@/server/db/schema";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import type { QuizData } from "@/components/organisms/quiz-slide-editor";
import { useCertificationTopicStore } from "@/stores/certification-topic-store";

type Topic = typeof certificationTopics.$inferSelect;
type Slide = typeof certificationSlides.$inferSelect;

type ExtendedSlideData = SlideData & {
  quizData?: QuizData | null;
};

// Helper function to create a URL-friendly slug from a title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
}

export default function APCertificationTopicPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const stageCode = params?.stage as string;
  const topicSlug = params?.topic as string;
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const lastViewedSlideRef = useRef<string | null>(null);

  // Zustand store
  const {
    getTopic,
    getSlides,
    getAttempt,
    getSelectedAnswers,
    isSlideUnlocked,
    setTopic,
    setSlides,
    setAttempt,
    setSelectedAnswer,
    setLoading,
    setError,
    loading: storeLoading,
    errors: storeErrors,
  } = useCertificationTopicStore();

  // Get data from store
  const [foundTopicId, setFoundTopicId] = useState<string | null>(null);
  const topic = foundTopicId ? getTopic(foundTopicId) : null;
  const slides = foundTopicId ? getSlides(foundTopicId) || [] : [];
  const currentAttempt = foundTopicId ? getAttempt(foundTopicId) : null;
  const selectedAnswers = foundTopicId ? getSelectedAnswers(foundTopicId) : {};
  const isLoading = foundTopicId ? (storeLoading[foundTopicId] ?? false) : true;
  const error = foundTopicId ? (storeErrors[foundTopicId] ?? null) : null;

  // Calculate unlocked slides
  const slideIdsForUnlock = slides.map((s) => s.id);
  const unlockedSlideIds = slides
    .filter((slide) =>
      foundTopicId && slide
        ? isSlideUnlocked(foundTopicId, slide.id, slideIdsForUnlock)
        : slideIdsForUnlock.length > 0 && slideIdsForUnlock[0] === slide.id
    )
    .map((s) => s.id);
  const isCompleted = currentAttempt?.status === "completed";

  // Check if all slides are completed (viewed for content, answered for quiz)
  const allSlidesCompleted = useMemo(() => {
    if (!currentAttempt || !foundTopicId || slides.length === 0) {
      return false;
    }

    const slideProgress =
      (currentAttempt.slideProgress as Record<string, any>) || {};

    for (const slide of slides) {
      const progress = slideProgress[slide.id];

      if (slide.kind === "quiz") {
        // Quiz slides need to be answered
        if (!progress?.answered) {
          return false;
        }
      } else {
        // Content slides need to be viewed
        if (!progress?.viewed) {
          return false;
        }
      }
    }

    return true;
  }, [currentAttempt, slides, foundTopicId]);

  // Helper function to check if a quiz slide has been answered
  const isQuizAnswered = useCallback(
    (slideId: string) => {
      if (!currentAttempt) return false;
      const slideProgress =
        (currentAttempt.slideProgress as Record<string, any>) || {};
      return slideProgress[slideId]?.answered === true;
    },
    [currentAttempt]
  );

  // Helper function to check if a slide has been viewed
  const isSlideViewed = useCallback(
    (slideId: string) => {
      if (!currentAttempt) return false;
      const slideProgress =
        (currentAttempt.slideProgress as Record<string, any>) || {};
      return slideProgress[slideId]?.viewed === true;
    },
    [currentAttempt]
  );

  usePageTitle(["ap-certification", stageCode, topicSlug]);

  useEffect(() => {
    const fetchTopic = async () => {
      if (!stageCode || !topicSlug) return;

      // Fetch all topics for this stage
      const topicsResult = await certificationApi.topics.byStageCode(stageCode);
      if (!topicsResult.data) {
        // We need a topicId to set error, so we'll handle this differently
        console.error("Failed to fetch topics:", topicsResult.error);
        return;
      }

      // Find the topic with matching slug
      const foundTopic = topicsResult.data.find(
        (t) => createSlug(t.title) === topicSlug
      );

      if (!foundTopic) {
        console.error("Topic not found");
        return;
      }

      setFoundTopicId(foundTopic.id);
      setTopic(foundTopic.id, foundTopic);

      // Check if we already have slides cached
      const cachedSlides = getSlides(foundTopic.id);
      if (cachedSlides) {
        // Use cached slides, check for saved progress or URL param
        const slideParam = searchParams.get("slide");
        let targetSlideIndex = 0;

        if (slideParam) {
          // URL param takes precedence
          const slideNum = parseInt(slideParam, 10);
          if (
            !isNaN(slideNum) &&
            slideNum >= 1 &&
            slideNum <= cachedSlides.length + 1
          ) {
            targetSlideIndex = slideNum - 1;
          }
        } else {
          // No URL param, check for saved progress
          const cachedAttempt = getAttempt(foundTopic.id);
          if (cachedAttempt?.currentSlideId) {
            const slideIndex = cachedSlides.findIndex(
              (s) => s.id === cachedAttempt.currentSlideId
            );
            if (slideIndex >= 0) {
              targetSlideIndex = slideIndex;
              // Update URL to reflect saved position
              isNavigatingRef.current = true;
              const params = new URLSearchParams(searchParams.toString());
              params.set("slide", (targetSlideIndex + 1).toString());
              router.replace(`?${params.toString()}`, { scroll: false });
            }
          }
        }
        setCurrentSlideIndex(targetSlideIndex);
        setLoading(foundTopic.id, false);
        return;
      }

      // Fetch slides for this topic
      setLoading(foundTopic.id, true);
      try {
        const slidesResult = await certificationApi.topics.slides.list(
          foundTopic.id
        );
        if (slidesResult.data) {
          const sortedSlides: ExtendedSlideData[] = slidesResult.data
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((slide) => ({
              id: slide.id,
              kind: slide.kind as SlideData["kind"],
              orderIndex: slide.orderIndex,
              textHtml: slide.textHtml ?? null,
              imageUrl: slide.imageUrl ?? null,
              videoUrl: slide.videoUrl ?? null,
              videoStartS: slide.videoStartS ?? null,
              videoEndS: slide.videoEndS ?? null,
              quizData: (slide as any).quizData as QuizData | null,
              effectiveNotes: (slide as any).officialNotes ?? null,
            }));
          setSlides(foundTopic.id, sortedSlides);

          // Load or create topic progress attempt first
          let targetSlideIndex = 0;
          let shouldUpdateUrl = false;

          try {
            const cachedAttempt = getAttempt(foundTopic.id);
            let attempt = cachedAttempt;

            if (!attempt) {
              const progressResult = await certificationApi.topics.progress.get(
                foundTopic.id
              );
              if (progressResult.data?.attempt) {
                attempt = progressResult.data.attempt;
                setAttempt(foundTopic.id, attempt);
              }
            }

            // Check URL parameter first (takes precedence)
            const slideParam = searchParams.get("slide");
            if (slideParam) {
              const slideNum = parseInt(slideParam, 10);
              // Allow slide numbers from 1 to slides.length + 1 (completion slide)
              if (
                !isNaN(slideNum) &&
                slideNum >= 1 &&
                slideNum <= sortedSlides.length + 1
              ) {
                const requestedIndex = slideNum - 1;
                const requestedSlideId = sortedSlides[requestedIndex]?.id;

                // Validate slide is unlocked (allow if completed for review)
                if (
                  attempt?.status === "completed" ||
                  !attempt ||
                  !requestedSlideId
                ) {
                  targetSlideIndex = requestedIndex;
                } else {
                  // Use store method to check if unlocked
                  const slideIds = sortedSlides.map((s) => s.id);
                  const isUnlocked = isSlideUnlocked(
                    foundTopic.id,
                    requestedSlideId,
                    slideIds
                  );

                  if (isUnlocked) {
                    targetSlideIndex = requestedIndex;
                  } else {
                    // Redirect to highest unlocked slide
                    // Find the highest unlocked slide index
                    let highestUnlockedIndex = 0;
                    for (let i = 0; i < sortedSlides.length; i++) {
                      if (
                        isSlideUnlocked(
                          foundTopic.id,
                          sortedSlides[i].id,
                          slideIds
                        )
                      ) {
                        highestUnlockedIndex = i;
                      } else {
                        break;
                      }
                    }
                    targetSlideIndex = highestUnlockedIndex;
                    shouldUpdateUrl = true;
                  }
                }
              }
            } else if (attempt?.currentSlideId) {
              // No URL param, resume from saved position
              const slideIndex = sortedSlides.findIndex(
                (s) => s.id === attempt.currentSlideId
              );
              if (slideIndex >= 0) {
                // Validate the saved position is still unlocked
                const slideIds = sortedSlides.map((s) => s.id);
                if (
                  attempt.status === "completed" ||
                  isSlideUnlocked(
                    foundTopic.id,
                    attempt.currentSlideId,
                    slideIds
                  )
                ) {
                  targetSlideIndex = slideIndex;
                  shouldUpdateUrl = true; // Update URL to reflect saved position
                } else {
                  // Find highest unlocked slide
                  let highestUnlockedIndex = 0;
                  for (let i = 0; i < sortedSlides.length; i++) {
                    if (
                      isSlideUnlocked(
                        foundTopic.id,
                        sortedSlides[i].id,
                        slideIds
                      )
                    ) {
                      highestUnlockedIndex = i;
                    } else {
                      break;
                    }
                  }
                  targetSlideIndex = highestUnlockedIndex;
                  shouldUpdateUrl = true;
                }
              }
            }

            // Create attempt if it doesn't exist
            if (!attempt) {
              const createResult =
                await certificationApi.topics.progress.create(foundTopic.id, {
                  currentSlideId:
                    sortedSlides[targetSlideIndex]?.id ?? sortedSlides[0]?.id,
                });
              if (createResult.data?.attempt) {
                attempt = createResult.data.attempt;
                // Refresh attempt to get updated slideProgress (first slide is marked as viewed)
                const progressResult =
                  await certificationApi.topics.progress.get(foundTopic.id);
                if (progressResult.data?.attempt) {
                  setAttempt(foundTopic.id, progressResult.data.attempt);
                  attempt = progressResult.data.attempt;
                } else {
                  setAttempt(foundTopic.id, attempt);
                }
              }
            }

            // Mark first slide as viewed if we're starting on slide 1 and it hasn't been viewed yet
            if (
              attempt &&
              targetSlideIndex === 0 &&
              sortedSlides.length > 0 &&
              attempt.status !== "completed"
            ) {
              const firstSlideId = sortedSlides[0].id;
              const slideProgress =
                (attempt.slideProgress as Record<string, any>) || {};
              if (!slideProgress[firstSlideId]?.viewed) {
                // Mark first slide as viewed to unlock slide 2
                try {
                  await certificationApi.topics.slides.markViewed(
                    foundTopic.id,
                    firstSlideId
                  );
                  // Refresh attempt to get updated slideProgress
                  const progressResult =
                    await certificationApi.topics.progress.get(foundTopic.id);
                  if (progressResult.data?.attempt) {
                    setAttempt(foundTopic.id, progressResult.data.attempt);
                  }
                } catch (err) {
                  console.error("Failed to mark first slide as viewed:", err);
                }
              }
            }

            // Set slide index and update URL if needed
            setCurrentSlideIndex(targetSlideIndex);
            if (shouldUpdateUrl) {
              isNavigatingRef.current = true;
              const params = new URLSearchParams(searchParams.toString());
              params.set("slide", (targetSlideIndex + 1).toString());
              router.replace(`?${params.toString()}`, { scroll: false });
            }
          } catch (progressError) {
            console.error("Failed to load progress:", progressError);
            // Continue without progress tracking if it fails
            setCurrentSlideIndex(targetSlideIndex);
          }
        }
      } catch (err) {
        console.error("Failed to fetch slides:", err);
        setError(
          foundTopic.id,
          err instanceof Error ? err.message : "Failed to fetch slides"
        );
      } finally {
        setLoading(foundTopic.id, false);
      }
    };

    fetchTopic();
  }, [
    stageCode,
    topicSlug,
    searchParams,
    getSlides,
    getAttempt,
    isSlideUnlocked,
    setTopic,
    setSlides,
    setAttempt,
    setLoading,
    setError,
  ]);

  // Sync slide index when URL parameter changes (browser back/forward or direct URL change)
  // Only sync FROM URL, not TO URL (handlers update URL directly)
  useEffect(() => {
    // Skip if we're programmatically navigating
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    if (!isLoading && slides.length > 0 && foundTopicId) {
      const slideParam = searchParams.get("slide");
      if (slideParam) {
        const slideNum = parseInt(slideParam, 10);
        if (
          !isNaN(slideNum) &&
          slideNum >= 1 &&
          slideNum <= slides.length + 1
        ) {
          const newIndex = slideNum - 1;
          const targetSlide = slides[newIndex];

          // Validate slide is unlocked (allow if completed for review)
          if (targetSlide) {
            const slideIdsForValidation = slides.map((s) => s.id);
            if (
              currentAttempt?.status === "completed" ||
              isSlideUnlocked(
                foundTopicId,
                targetSlide.id,
                slideIdsForValidation
              )
            ) {
              // Only update if different to avoid unnecessary re-renders
              if (newIndex !== currentSlideIndex) {
                setCurrentSlideIndex(newIndex);
              }
            } else {
              // Redirect to highest unlocked slide
              let highestUnlockedIndex = 0;
              for (let i = 0; i < slides.length; i++) {
                if (
                  isSlideUnlocked(
                    foundTopicId,
                    slides[i].id,
                    slideIdsForValidation
                  )
                ) {
                  highestUnlockedIndex = i;
                } else {
                  break;
                }
              }
              if (highestUnlockedIndex !== currentSlideIndex) {
                isNavigatingRef.current = true;
                setCurrentSlideIndex(highestUnlockedIndex);
                const params = new URLSearchParams(searchParams.toString());
                params.set("slide", (highestUnlockedIndex + 1).toString());
                router.replace(`?${params.toString()}`, { scroll: false });
              }
            }
          }
        }
      } else if (currentSlideIndex !== 0) {
        // If no slide param but we're not on slide 0, reset to 0
        setCurrentSlideIndex(0);
      }
    }
  }, [
    searchParams,
    slides,
    isLoading,
    foundTopicId,
    currentAttempt,
    isSlideUnlocked,
    currentSlideIndex,
    router,
  ]);

  const handleNextSlide = useCallback(async () => {
    // Allow going to completion slide (slides.length) if not already there
    if (currentSlideIndex < slides.length) {
      const newIndex = currentSlideIndex + 1;
      const nextSlide = slides[newIndex];

      // Check if next slide is unlocked (allow if completed for review)
      if (nextSlide && foundTopicId) {
        const slideIds = slides.map((s) => s.id);
        if (
          currentAttempt?.status !== "completed" &&
          !isSlideUnlocked(foundTopicId, nextSlide.id, slideIds)
        ) {
          // Slide is locked, don't navigate
          return;
        }
      }

      // Mark that we're programmatically navigating
      isNavigatingRef.current = true;
      setCurrentSlideIndex(newIndex);

      // Update URL parameter using Next.js router
      const params = new URLSearchParams(searchParams.toString());
      params.set("slide", (newIndex + 1).toString());
      router.replace(`?${params.toString()}`, { scroll: false });

      // Update progress tracking (only if attempt is not completed and not on completion slide)
      if (
        topic &&
        currentAttempt &&
        newIndex < slides.length &&
        slides[newIndex] &&
        currentAttempt.status !== "completed"
      ) {
        try {
          await certificationApi.topics.progress.update(topic.id, {
            currentSlideId: slides[newIndex].id,
          });
        } catch (err) {
          console.error("Failed to update slide position:", err);
        }
      }
    }
  }, [
    currentSlideIndex,
    slides.length,
    slides,
    topic,
    currentAttempt,
    foundTopicId,
    isSlideUnlocked,
    searchParams,
    router,
  ]);

  const handlePrevSlide = useCallback(async () => {
    // Allow going back from completion slide
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;

      // Mark that we're programmatically navigating
      isNavigatingRef.current = true;
      setCurrentSlideIndex(newIndex);

      // Update URL parameter using Next.js router
      const params = new URLSearchParams(searchParams.toString());
      params.set("slide", (newIndex + 1).toString());
      router.replace(`?${params.toString()}`, { scroll: false });

      // Update progress tracking (only if attempt is not completed and not on completion slide)
      if (
        topic &&
        currentAttempt &&
        newIndex < slides.length &&
        slides[newIndex] &&
        currentAttempt.status !== "completed"
      ) {
        try {
          await certificationApi.topics.progress.update(topic.id, {
            currentSlideId: slides[newIndex].id,
          });
        } catch (err) {
          console.error("Failed to update slide position:", err);
        }
      }
    }
  }, [
    currentSlideIndex,
    slides.length,
    topic,
    currentAttempt,
    slides,
    searchParams,
    router,
  ]);

  // Keyboard navigation
  useEffect(() => {
    if (isLoading || error || !slides.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNextSlide();
      } else if (e.key === "ArrowLeft") {
        handlePrevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, slides.length, isLoading, error]);

  const handleGoToSlide = useCallback(
    async (index: number) => {
      // Allow navigating to any slide including completion slide (slides.length)
      if (index >= 0 && index <= slides.length) {
        const targetSlide = slides[index];

        // Check if target slide is unlocked (allow if completed for review)
        if (targetSlide && foundTopicId) {
          const slideIds = slides.map((s) => s.id);
          if (
            currentAttempt?.status !== "completed" &&
            !isSlideUnlocked(foundTopicId, targetSlide.id, slideIds)
          ) {
            // Slide is locked, don't navigate
            return;
          }
        }

        // Mark that we're programmatically navigating
        isNavigatingRef.current = true;
        setCurrentSlideIndex(index);

        // Update URL parameter using Next.js router
        const params = new URLSearchParams(searchParams.toString());
        params.set("slide", (index + 1).toString());
        router.replace(`?${params.toString()}`, { scroll: false });

        // Update progress tracking (only if attempt is not completed and not on completion slide)
        if (
          topic &&
          currentAttempt &&
          index < slides.length &&
          slides[index] &&
          currentAttempt.status !== "completed"
        ) {
          try {
            await certificationApi.topics.progress.update(topic.id, {
              currentSlideId: slides[index].id,
            });
          } catch (err) {
            console.error("Failed to update slide position:", err);
          }
        }
      }
    },
    [
      slides.length,
      slides,
      topic,
      currentAttempt,
      foundTopicId,
      isSlideUnlocked,
      searchParams,
      router,
    ]
  );

  const handleQuizAnswer = useCallback(
    async (
      slideId: string,
      answerId: string,
      isCorrect: boolean,
      timeTaken?: number
    ) => {
      if (!topic || !currentAttempt) return;

      try {
        // Get stageId from currentAttempt (it's stored there)
        const stageId =
          (currentAttempt as any).stageId || (topic as any).stageId;
        if (!stageId) {
          console.error("Stage ID not available");
          return;
        }

        await certificationApi.answers.create({
          stageId,
          topicId: topic.id,
          slideId,
          attemptId: currentAttempt.id,
          answerId,
          isCorrect,
          timeTaken,
        });

        // Update selected answers in store
        if (topic) {
          setSelectedAnswer(topic.id, slideId, answerId);
        }

        // Refresh attempt to get updated slideProgress
        if (topic.id) {
          const progressResult = await certificationApi.topics.progress.get(
            topic.id
          );
          if (progressResult.data?.attempt) {
            setAttempt(topic.id, progressResult.data.attempt);
          }
        }
      } catch (err) {
        console.error("Failed to save answer:", err);
      }
    },
    [topic, currentAttempt, setSelectedAnswer, setAttempt]
  );

  const handleAnswerSelect = useCallback(
    (slideId: string, answerId: string, isCorrect: boolean) => {
      // Update store immediately for UI feedback
      if (topic) {
        setSelectedAnswer(topic.id, slideId, answerId);
      }

      // Save to database
      handleQuizAnswer(slideId, answerId, isCorrect);
    },
    [handleQuizAnswer, topic, setSelectedAnswer]
  );

  const handleCompleteTopic = useCallback(async () => {
    if (!topic || !currentAttempt || isCompleting) return;

    try {
      setIsCompleting(true);

      // Update attempt status to completed (score will be calculated server-side)
      const result = await certificationApi.topics.progress.update(topic.id, {
        status: "completed",
      });

      if (result.error) {
        console.error("Failed to complete topic:", result.error);
        alert("Failed to complete topic. Please try again.");
        return;
      }

      // Redirect to stage page
      router.push(`/ap-certification/${stageCode}`);
    } catch (err) {
      console.error("Error completing topic:", err);
      alert("An error occurred while completing the topic. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  }, [topic, currentAttempt, isCompleting, stageCode, router]);

  // Track slide views when slide becomes visible
  useEffect(() => {
    // Reset ref when slide index changes
    if (slides.length > 0 && currentSlideIndex < slides.length) {
      const currentSlide = slides[currentSlideIndex];
      if (currentSlide && lastViewedSlideRef.current !== currentSlide.id) {
        lastViewedSlideRef.current = null; // Reset to allow processing new slide
      }
    }
  }, [currentSlideIndex, slides]);

  // Mark slide as viewed when it becomes visible
  useEffect(() => {
    if (
      !isLoading &&
      slides.length > 0 &&
      foundTopicId &&
      currentSlideIndex < slides.length &&
      currentAttempt &&
      currentAttempt.status !== "completed"
    ) {
      const currentSlide = slides[currentSlideIndex];
      if (currentSlide && lastViewedSlideRef.current !== currentSlide.id) {
        // Check if slide has already been viewed to prevent unnecessary API calls
        const slideProgress =
          (currentAttempt.slideProgress as Record<string, any>) || {};
        const slideProgressData = slideProgress[currentSlide.id];

        // Only mark as viewed if not already viewed
        if (!slideProgressData?.viewed) {
          // Track that we're processing this slide
          lastViewedSlideRef.current = currentSlide.id;

          // Mark slide as viewed and refresh attempt to update unlock status
          certificationApi.topics.slides
            .markViewed(foundTopicId, currentSlide.id)
            .then(async () => {
              // Refresh attempt to get updated slideProgress
              if (foundTopicId) {
                const progressResult =
                  await certificationApi.topics.progress.get(foundTopicId);
                if (progressResult.data?.attempt) {
                  setAttempt(foundTopicId, progressResult.data.attempt);
                }
              }
            })
            .catch((err) => {
              console.error("Failed to mark slide as viewed:", err);
              // Reset ref on error so we can retry
              lastViewedSlideRef.current = null;
            });
        } else {
          // Slide already viewed, just track it
          lastViewedSlideRef.current = currentSlide.id;
        }
      }
    }
  }, [
    currentSlideIndex,
    slides,
    isLoading,
    foundTopicId,
    currentAttempt?.slideProgress,
    setAttempt,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {error ?? "Topic not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSlide =
    currentSlideIndex < slides.length ? slides[currentSlideIndex] : null;
  const canGoPrev = currentSlideIndex > 0;
  // Check if next slide is unlocked
  const nextSlide =
    currentSlideIndex < slides.length ? slides[currentSlideIndex + 1] : null;
  const slideIdsForNav = slides.map((s) => s.id);
  const canGoNext =
    currentSlideIndex < slides.length &&
    (isCompleted ||
      !nextSlide ||
      (foundTopicId &&
        isSlideUnlocked(foundTopicId, nextSlide.id, slideIdsForNav)));
  const isOnCompletionSlide = currentSlideIndex === slides.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{topic.title}</h2>
            {topic.officialNotes && (
              <p className="text-muted-foreground mt-2">
                {topic.officialNotes}
              </p>
            )}
          </div>
          {currentAttempt && (
            <div className="text-sm text-muted-foreground">
              Attempt {currentAttempt.attemptNumber}
              {currentAttempt.status !== "started" && (
                <span className="ml-2 capitalize">
                  ({currentAttempt.status})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {slides.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No slides available for this topic.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Slide Display (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            {/* Slide Display - Consistent Aspect Ratio */}
            <div className="relative w-full">
              {isOnCompletionSlide && !isCompleted ? (
                // Completion Slide (additional slide at the end)
                <div className="aspect-video flex flex-col items-start justify-start space-y-4 bg-muted rounded-lg p-8 overflow-y-auto">
                  <div className="w-full text-center space-y-2 mb-4">
                    <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                    <h2 className="text-2xl font-bold">
                      You've reached the end!
                    </h2>
                    <p className="text-muted-foreground">
                      Complete all slides and answer all quizzes to finish.
                    </p>
                  </div>

                  {/* Slide Checklist */}
                  <div className="w-full space-y-2">
                    {slides.map((slide, index) => {
                      const slideProgress =
                        (currentAttempt?.slideProgress as Record<
                          string,
                          any
                        >) || {};
                      const progress = slideProgress[slide.id];
                      const isViewed = progress?.viewed === true;
                      const isAnswered =
                        slide.kind === "quiz"
                          ? progress?.answered === true
                          : true;
                      const isComplete =
                        slide.kind === "quiz" ? isAnswered : isViewed;

                      return (
                        <div
                          key={slide.id}
                          onClick={() => handleGoToSlide(index)}
                          className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                            isComplete
                              ? "bg-card border-border hover:bg-accent"
                              : "bg-orange-50 border-orange-200 hover:bg-orange-100 dark:bg-orange-950 dark:border-orange-800"
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">
                              Slide {index + 1}
                              {slide.kind === "quiz" && " (Quiz)"}
                            </div>
                            {!isComplete && (
                              <div className="text-sm text-orange-600 dark:text-orange-400">
                                {slide.kind === "quiz"
                                  ? "Answer required"
                                  : "Not viewed"}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="w-full pt-4 border-t">
                    <Button
                      onClick={handleCompleteTopic}
                      disabled={isCompleting || !allSlidesCompleted}
                      size="lg"
                      className="w-full"
                      title={
                        !allSlidesCompleted
                          ? "Complete all slides and answer all quizzes to finish"
                          : ""
                      }
                    >
                      {isCompleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        "Complete Topic"
                      )}
                    </Button>
                  </div>
                </div>
              ) : currentSlide && currentSlide.kind === "quiz" ? (
                // Quiz Display - Maintain aspect ratio container
                <div className="aspect-video flex flex-col justify-center space-y-6 bg-muted rounded-lg p-8">
                  {/* Question - Centered and Bold */}
                  <div className="text-center">
                    <h2 className="text-2xl font-bold">
                      {currentSlide.quizData?.question || "Question"}
                    </h2>
                  </div>
                  {/* Answers - Single Column Grid with Radio Buttons */}
                  <div className="flex justify-center">
                    <RadioGroup
                      className="w-full max-w-md space-y-2"
                      value={selectedAnswers[currentSlide.id] || ""}
                      onValueChange={(value) => {
                        if (!currentSlide.quizData) return;
                        const selectedAnswer =
                          currentSlide.quizData.answers.find(
                            (a) => a.id === value
                          );
                        if (selectedAnswer) {
                          handleAnswerSelect(
                            currentSlide.id,
                            selectedAnswer.id,
                            selectedAnswer.isCorrect || false
                          );
                        }
                      }}
                    >
                      {currentSlide.quizData?.answers.map(
                        (answer: any, index: number) => {
                          const isSelected =
                            selectedAnswers[currentSlide.id] === answer.id;
                          return (
                            <div
                              key={answer.id || index}
                              className={`flex items-center space-x-3 p-4 border rounded-md bg-card transition-all cursor-pointer hover:bg-accent ${
                                isSelected
                                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                                  : "border-border"
                              }`}
                              onClick={() => {
                                if (!currentSlide.quizData) return;
                                handleAnswerSelect(
                                  currentSlide.id,
                                  answer.id,
                                  answer.isCorrect || false
                                );
                              }}
                            >
                              <RadioGroupItem
                                value={answer.id || `answer-${index}`}
                                id={answer.id || `answer-${index}`}
                                checked={isSelected}
                              />
                              <Label
                                htmlFor={answer.id || `answer-${index}`}
                                className="flex-1 cursor-pointer"
                              >
                                {answer.text || `Answer ${index + 1}`}
                              </Label>
                            </div>
                          );
                        }
                      ) || []}
                    </RadioGroup>
                  </div>
                </div>
              ) : (
                // Regular Slide Display - Consistent Aspect Ratio
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <SlideRenderer
                    slide={currentSlide}
                    className="w-full h-full"
                    isCertification={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Controls and Information (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">
                      Slide Navigation
                    </div>
                    <div className="text-lg font-semibold">
                      {currentSlideIndex + 1} of {slides.length + 1}
                    </div>
                  </div>

                  {/* Slide Selector Dropdown */}
                  {slides.length > 1 && (
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        Jump to Slide
                      </Label>
                      <Select
                        value={currentSlideIndex.toString()}
                        onValueChange={(value) => {
                          const index = parseInt(value, 10);
                          handleGoToSlide(index);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {isOnCompletionSlide
                              ? "Complete Topic"
                              : `Slide ${currentSlideIndex + 1}${currentSlide?.kind === "quiz" ? " (Quiz)" : ""}`}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {slides.map((slide, index) => {
                            const slideIdsForDropdown = slides.map((s) => s.id);
                            const isUnlocked =
                              isCompleted ||
                              (foundTopicId &&
                                isSlideUnlocked(
                                  foundTopicId,
                                  slide.id,
                                  slideIdsForDropdown
                                ));
                            const slideProgress =
                              (currentAttempt?.slideProgress as Record<
                                string,
                                any
                              >) || {};
                            const progress = slideProgress[slide.id];
                            const isQuizUnanswered =
                              slide.kind === "quiz" &&
                              isUnlocked &&
                              progress?.viewed === true &&
                              progress?.answered !== true;

                            return (
                              <SelectItem
                                key={slide.id}
                                value={index.toString()}
                                disabled={!isUnlocked}
                                className={!isUnlocked ? "opacity-50" : ""}
                              >
                                <div className="flex items-center gap-2">
                                  {!isUnlocked && <Lock className="h-3 w-3" />}
                                  {isQuizUnanswered && (
                                    <AlertTriangle className="h-3 w-3 text-orange-600" />
                                  )}
                                  <span
                                    className={
                                      isQuizUnanswered ? "text-orange-600" : ""
                                    }
                                  >
                                    Slide {index + 1}
                                    {slide.kind === "quiz" && " (Quiz)"}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                          {!isCompleted && (
                            <SelectItem value={slides.length.toString()}>
                              Complete Topic
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevSlide}
                      disabled={!canGoPrev}
                      className="flex-1"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>

                    {isOnCompletionSlide && !isCompleted ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleCompleteTopic}
                        disabled={isCompleting || !allSlidesCompleted}
                        className="flex-1"
                        title={
                          !allSlidesCompleted
                            ? "Complete all slides and answer all quizzes to finish"
                            : ""
                        }
                      >
                        {isCompleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Completing...
                          </>
                        ) : (
                          <>
                            Complete
                            <CheckCircle2 className="h-4 w-4 ml-1" />
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextSlide}
                        disabled={!canGoNext}
                        className="flex-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
