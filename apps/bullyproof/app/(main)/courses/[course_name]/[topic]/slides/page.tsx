"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Maximize,
  Minimize,
} from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type {
  courseTopics,
  courseTopicSlides,
  certificationCourses,
} from "@/server/db/schema";
import {
  SlideRenderer,
  type SlideData,
} from "@/components/organisms/slide-renderer";
import { useCertificationTopicStore } from "@/stores/certification-topic-store";
import { useCertificationSlidesCacheStore } from "@/stores/certification-slides-cache-store";
import { usePrefetchCertificationImages } from "@/hooks/use-prefetch-certification-images";
import { usePreloadAllSlideImages } from "@/hooks/use-preload-all-slide-images";
import { createSlug } from "@/utils/slug";
import { cn } from "@workspace/ui/lib/utils";
import { useMeStore } from "@/entities/me/model/store";

type Topic = typeof courseTopics.$inferSelect;
type Slide = typeof courseTopicSlides.$inferSelect;
type Course = typeof certificationCourses.$inferSelect;

type ExtendedSlideData = SlideData & {};

function CourseTopicSlidesPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseNameSlug = params?.course_name as string;
  const topicSlug = params?.topic as string;
  const slideId = searchParams.get("index");
  const fullscreenParam = searchParams.get("fullscreen");
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(fullscreenParam === "true");
  const [showControls, setShowControls] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [newSlideTimer, setNewSlideTimer] = useState<number | null>(null);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [hasQuizzes, setHasQuizzes] = useState<boolean | null>(null);
  const [showLockedDialog, setShowLockedDialog] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [isCheckingUnlock, setIsCheckingUnlock] = useState(true);
  const [isTopicUnlocked, setIsTopicUnlocked] = useState<boolean | null>(null);
  // Local state for tracking navigation and viewed slides (client-side only)
  const [localViewedSlides, setLocalViewedSlides] = useState<Set<string>>(new Set());
  const [pendingUpdates, setPendingUpdates] = useState<{
    currentSlideId: string | null;
    viewedSlides: Set<string>;
  }>({ currentSlideId: null, viewedSlides: new Set() });
  const router = useRouter();
  const currentUser = useMeStore((s) => s.currentUser);
  const isNavigatingRef = useRef(false);
  const lastViewedSlideRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timedSlideIdRef = useRef<string | null>(null);
  const currentAttemptRef = useRef<typeof currentAttempt>(null);
  const initialLoadCompleteRef = useRef(false);
  const lastUrlSlideIdRef = useRef<string | null>(null);
  const initializedTopicRef = useRef<string | null>(null);
  const redirectCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Zustand store
  const {
    getTopic,
    getSlides,
    getAttempt,
    isSlideUnlocked,
    setTopic,
    setSlides,
    setAttempt,
    setLoading,
    setError,
    loading: storeLoading,
    errors: storeErrors,
  } = useCertificationTopicStore();

  // Get data from store
  const [foundTopicId, setFoundTopicId] = useState<string | null>(null);
  const topic = foundTopicId ? getTopic(foundTopicId) : null;
  const allSlides = foundTopicId ? getSlides(foundTopicId) || [] : [];
  // Filter to only regular slides (not quizzes)
  const slides = allSlides.filter((slide) => slide.kind !== "quiz");
  const currentAttempt = foundTopicId ? getAttempt(foundTopicId) : null;
  const isLoading = foundTopicId ? (storeLoading[foundTopicId] ?? false) : true;
  const error = foundTopicId ? (storeErrors[foundTopicId] ?? null) : null;

  const isCompleted = currentAttempt?.status === "completed";

  // Find current slide by ID
  const currentSlide = currentSlideId
    ? slides.find((s) => s.id === currentSlideId) || null
    : null;
  const currentSlideIndex = currentSlide
    ? slides.findIndex((s) => s.id === currentSlide.id)
    : -1;

  usePageTitle(["courses", courseNameSlug, topicSlug, "slides"]);

  // Pre-fetch all image URLs in background when topic loads
  usePrefetchCertificationImages(slides, !isLoading && slides.length > 0);
  
  // Preload all slide images into browser cache for instant navigation
  usePreloadAllSlideImages(slides, !isLoading && slides.length > 0, true);

  // Helper function to build URL for a slide
  const buildSlideUrl = useCallback(
    (slideId: string) => {
      if (!courseNameSlug || !topicSlug) return "";
      return `/courses/${courseNameSlug}/${topicSlug}/slides?index=${encodeURIComponent(slideId)}`;
    },
    [courseNameSlug, topicSlug]
  );

  // Ref to track pending updates (avoids stale closure issues)
  const pendingUpdatesRef = useRef<{
    currentSlideId: string | null;
    viewedSlides: Set<string>;
  }>({ currentSlideId: null, viewedSlides: new Set() });

  // Immediate batch update function - executes instantly without delay (for last slide)
  const immediateBatchedUpdate = useCallback(
    async (topicId: string, slideId: string, viewedSlides: Set<string>) => {
      try {
        // Convert viewed slides Set to array
        const viewedSlidesArray = Array.from(viewedSlides);

        // Send all updates in a single batch API call immediately
        const batchResult = await certificationApi.topics.progress.batch(topicId, {
          currentSlideId: slideId || undefined,
          viewedSlideIds: viewedSlidesArray,
        });

        // Update local state with server response
        if (batchResult.data?.attempt && foundTopicId) {
          setAttempt(foundTopicId, batchResult.data.attempt);
        }
      } catch (err) {
        console.error("Failed to batch update progress:", err);
      }
    },
    [foundTopicId, setAttempt]
  );

  // Batched update function - sends all navigation changes after user stops navigating
  const scheduleBatchedUpdate = useCallback(
    (topicId: string, slideId: string, viewedSlides: Set<string>) => {
      // Clear any existing batch update timeout
      if (batchUpdateTimeoutRef.current) {
        clearTimeout(batchUpdateTimeoutRef.current);
      }

      // Update pending updates ref and state
      pendingUpdatesRef.current = {
        currentSlideId: slideId,
        viewedSlides: new Set(viewedSlides),
      };
      setPendingUpdates(pendingUpdatesRef.current);

      // Schedule batch update after 3 seconds of inactivity
      batchUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          const updates = pendingUpdatesRef.current;
          
          // Convert viewed slides Set to array
          const viewedSlidesArray = Array.from(updates.viewedSlides);

          // Send all updates in a single batch API call
          const batchResult = await certificationApi.topics.progress.batch(topicId, {
            currentSlideId: updates.currentSlideId || undefined,
            viewedSlideIds: viewedSlidesArray,
          });

          // Update local state with server response
          if (batchResult.data?.attempt && foundTopicId) {
            setAttempt(foundTopicId, batchResult.data.attempt);
          }

          // Clear pending updates
          pendingUpdatesRef.current = { currentSlideId: null, viewedSlides: new Set() };
          setPendingUpdates(pendingUpdatesRef.current);
        } catch (err) {
          console.error("Failed to batch update progress:", err);
        } finally {
          batchUpdateTimeoutRef.current = null;
        }
      }, 3000);
    },
    [foundTopicId, setAttempt]
  );


  // Fetch course by slug first
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseNameSlug) return;

      try {
        const result = await certificationApi.courses.bySlug(courseNameSlug);
        if (result.data) {
          setCourse(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch course:", err);
      }
    };

    fetchCourse();
  }, [courseNameSlug]);

  // Check topic unlock status BEFORE loading slides
  useEffect(() => {
    const checkTopicUnlock = async () => {
      if (!course || !topicSlug) {
        setIsCheckingUnlock(false);
        return;
      }

      setIsCheckingUnlock(true);
      setIsTopicUnlocked(null);

      try {
        // Fetch all topics for this course
        const topicsResult = await certificationApi.topics.byCourseCode(course.code);
        if (!topicsResult.data) {
          console.error("Failed to fetch topics:", topicsResult.error);
          setIsCheckingUnlock(false);
          setIsTopicUnlocked(false);
          return;
        }

        // Find the topic with matching slug
        const foundTopic = topicsResult.data.find(
          (t) => createSlug(t.title) === topicSlug
        );

        if (!foundTopic) {
          console.error("Topic not found");
          setIsCheckingUnlock(false);
          setIsTopicUnlocked(false);
          return;
        }

        // Check if topic is unlocked (all previous topics completed)
        const topicOrder = foundTopic.courseOrder ?? 1;
        const isFirstTopic = topicOrder === 1;
        
        if (isFirstTopic) {
          // First topic is always unlocked
          setIsTopicUnlocked(true);
          setIsCheckingUnlock(false);
          return;
        }

        // For non-first topics, check if user is logged in
        if (!currentUser?.id) {
          // No user - assume locked
          setIsTopicUnlocked(false);
          setIsCheckingUnlock(false);
          setShowLockedDialog(true);
          return;
        }

        // Fetch course progress to check if previous topics are completed
        const progressResult = await certificationApi.courses.progress.byCode(course.code);
        if (progressResult.data?.progress) {
          // Get all topics for the course
          const allTopics = topicsResult.data;
          
          // Get completed topic IDs
          const completedTopicIds = new Set(
            progressResult.data.progress
              .filter((p: any) => p.status === "completed" || p.status === "passed")
              .map((p: any) => p.topicId)
          );
          
          // Check if all topics with lower courseOrder are completed
          const previousTopics = allTopics.filter(
            (t) => {
              const tOrder = t.courseOrder ?? 999;
              return tOrder < topicOrder;
            }
          );
          
          const allPreviousCompleted = previousTopics.length === 0 || previousTopics.every((t) =>
            completedTopicIds.has(t.id)
          );
          
          if (!allPreviousCompleted) {
            // Topic is locked - delete invalid slide views and show dialog
            try {
              // Delete slide views for this topic via API
              await fetch(`/api/user-slide-views/delete-by-topic`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topicId: foundTopic.id }),
              });
            } catch (err) {
              console.error("Failed to delete slide views:", err);
            }
            
            setIsTopicUnlocked(false);
            setShowLockedDialog(true);
          } else {
            setIsTopicUnlocked(true);
          }
        } else {
          // No progress data - assume locked if not first topic
          setIsTopicUnlocked(false);
          setShowLockedDialog(true);
        }
      } catch (err) {
        console.error("Failed to check topic unlock:", err);
        setIsTopicUnlocked(false);
        setShowLockedDialog(true);
      } finally {
        setIsCheckingUnlock(false);
      }
    };

    checkTopicUnlock();
  }, [course, topicSlug, currentUser?.id]);

  useEffect(() => {
    const fetchTopic = async () => {
      if (!course || !topicSlug) return;
      
      // Don't load slides until unlock check is complete and topic is unlocked
      if (isCheckingUnlock || isTopicUnlocked !== true) return;
      
      // Check if this is a new topic (haven't initialized for this topic yet)
      const isNewTopic = initializedTopicRef.current !== topicSlug;
      if (isNewTopic) {
        // Reset flags for new topic
        initialLoadCompleteRef.current = false;
        initializedTopicRef.current = topicSlug;
      }
      
      // Read slideId from URL only on initial load (first time this topic loads)
      const initialSlideId = isNewTopic ? searchParams.get("index") : null;

      // Fetch all topics for this course
      const topicsResult = await certificationApi.topics.byCourseCode(course.code);
      if (!topicsResult.data) {
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
      // Reset quiz check only when topic actually changes (not on status updates)
      // Don't reset if completion modal is open to prevent flickering
      // This prevents the completion modal from flickering when attempt status updates
      if (isNewTopic && !showCompletionModal) {
        setHasQuizzes(null);
      }

      // Check if we already have slides cached
      const cachedSlides = getSlides(foundTopic.id);
      if (cachedSlides) {
        // Filter to only regular slides
        const regularSlides = cachedSlides.filter((s) => s.kind !== "quiz");
        let targetSlideId: string | null = null;

        if (initialSlideId) {
          // Check if the requested slide ID exists
          const requestedSlide = regularSlides.find((s) => s.id === initialSlideId);
          if (requestedSlide) {
            const slideIds = regularSlides.map((s) => s.id);
            const isUnlocked =
              currentAttempt?.status === "completed" ||
              !currentAttempt ||
              isSlideUnlocked(foundTopic.id, requestedSlide.id, slideIds);
            if (isUnlocked) {
              targetSlideId = requestedSlide.id;
            }
          }
        }

        // If no valid slide ID from query param, check saved progress
        if (!targetSlideId) {
          const cachedAttempt = getAttempt(foundTopic.id);
          if (cachedAttempt?.currentSlideId) {
            const slide = regularSlides.find(
              (s) => s.id === cachedAttempt.currentSlideId
            );
            if (slide) {
              const slideIds = regularSlides.map((s) => s.id);
              const isUnlocked =
                cachedAttempt.status === "completed" ||
                isSlideUnlocked(
                  foundTopic.id,
                  cachedAttempt.currentSlideId,
                  slideIds
                );
              if (isUnlocked) {
                targetSlideId = slide.id;
                // Update URL if needed
                if (targetSlideId !== initialSlideId) {
                  isNavigatingRef.current = true;
                  const targetUrl = buildSlideUrl(targetSlideId);
                  if (targetUrl) {
                    router.replace(targetUrl, { scroll: false });
                  }
                }
              }
            }
          }
        }

        // Default to first slide if nothing found
        if (!targetSlideId && regularSlides.length > 0) {
          targetSlideId = regularSlides[0].id;
          if (targetSlideId !== initialSlideId) {
            isNavigatingRef.current = true;
            const targetUrl = buildSlideUrl(targetSlideId);
            if (targetUrl) {
              router.replace(targetUrl, { scroll: false });
            }
          }
        }

        setCurrentSlideId(targetSlideId);
        lastUrlSlideIdRef.current = targetSlideId;
        setLoading(foundTopic.id, false);
        // Mark initial load as complete after setting initial slide
        initialLoadCompleteRef.current = true;
        return;
      }

      // Fetch slides for this topic
      setLoading(foundTopic.id, true);
      try {
        const slidesResult = await certificationApi.topics.slides.list(
          foundTopic.id
        );
        if (slidesResult.data) {
          const cacheStore = useCertificationSlidesCacheStore.getState();
          
          const sortedSlides: ExtendedSlideData[] = slidesResult.data
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((slide) => {
              const slideWithUrl = slide as typeof slide & { signedImageUrl?: string | null };
              if (slideWithUrl.signedImageUrl && slide.kind === "image") {
                cacheStore.setSlideUrl(slide.id, slideWithUrl.signedImageUrl);
              }
              
              return {
                id: slide.id,
                kind: slide.kind as SlideData["kind"],
                orderIndex: slide.orderIndex,
                textHtml: slide.textHtml ?? null,
                imageUrl: slide.imageUrl ?? null,
                videoUrl: slide.videoUrl ?? null,
                videoStartS: slide.videoStartS ?? null,
                videoEndS: slide.videoEndS ?? null,
                effectiveNotes: (slide as any).officialNotes ?? null,
              };
            });
          setSlides(foundTopic.id, sortedSlides);

          // Filter to only regular slides
          const regularSlides = sortedSlides.filter((s) => s.kind !== "quiz");
          let targetSlideId: string | null = null;
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

            // Check slide ID from query param (only on initial load)
            if (initialSlideId) {
              const requestedSlide = regularSlides.find((s) => s.id === initialSlideId);
              if (requestedSlide) {
                const slideIds = regularSlides.map((s) => s.id);
                const isUnlocked =
                  attempt?.status === "completed" ||
                  !attempt ||
                  isSlideUnlocked(foundTopic.id, requestedSlide.id, slideIds);

                if (isUnlocked) {
                  targetSlideId = requestedSlide.id;
                } else {
                  // Find highest unlocked slide
                  let highestUnlockedSlide: ExtendedSlideData | null = null;
                  for (let i = 0; i < regularSlides.length; i++) {
                    if (
                      isSlideUnlocked(
                        foundTopic.id,
                        regularSlides[i].id,
                        slideIds
                      )
                    ) {
                      highestUnlockedSlide = regularSlides[i];
                    } else {
                      break;
                    }
                  }
                  if (highestUnlockedSlide) {
                    targetSlideId = highestUnlockedSlide.id;
                    shouldUpdateUrl = true;
                  }
                }
              }
            }

            // If no valid slide ID from query param, use saved progress
            if (!targetSlideId && attempt?.currentSlideId) {
              const slide = regularSlides.find(
                (s) => s.id === attempt.currentSlideId
              );
              if (slide) {
                const slideIds = regularSlides.map((s) => s.id);
                if (
                  attempt.status === "completed" ||
                  isSlideUnlocked(foundTopic.id, attempt.currentSlideId, slideIds)
                ) {
                  targetSlideId = slide.id;
                  shouldUpdateUrl = true;
                } else {
                  // Find highest unlocked slide
                  let highestUnlockedSlide: ExtendedSlideData | null = null;
                  for (let i = 0; i < regularSlides.length; i++) {
                    if (
                      isSlideUnlocked(
                        foundTopic.id,
                        regularSlides[i].id,
                        slideIds
                      )
                    ) {
                      highestUnlockedSlide = regularSlides[i];
                    } else {
                      break;
                    }
                  }
                  if (highestUnlockedSlide) {
                    targetSlideId = highestUnlockedSlide.id;
                    shouldUpdateUrl = true;
                  }
                }
              }
            }

            // Default to first slide if nothing found
            if (!targetSlideId && regularSlides.length > 0) {
              targetSlideId = regularSlides[0].id;
              shouldUpdateUrl = true;
            }

            if (!attempt && targetSlideId) {
              const createResult =
                await certificationApi.topics.progress.create(foundTopic.id, {
                  currentSlideId: targetSlideId,
                });
              if (createResult.data?.attempt) {
                attempt = createResult.data.attempt;
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

            if (
              attempt &&
              targetSlideId === regularSlides[0]?.id &&
              regularSlides.length > 0 &&
              attempt.status !== "completed"
            ) {
              const slideProgress =
                (attempt.slideProgress as Record<string, any>) || {};
              if (!slideProgress[targetSlideId]?.viewed) {
                try {
                  await certificationApi.topics.slides.markViewed(
                    foundTopic.id,
                    targetSlideId
                  );
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

            setCurrentSlideId(targetSlideId);
            lastUrlSlideIdRef.current = targetSlideId;
            if (shouldUpdateUrl && targetSlideId) {
              isNavigatingRef.current = true;
              const targetUrl = buildSlideUrl(targetSlideId);
              if (targetUrl) {
                router.replace(targetUrl, { scroll: false });
              }
            }
            // Mark initial load as complete after setting initial slide
            initialLoadCompleteRef.current = true;
          } catch (progressError) {
            console.error("Failed to load progress:", progressError);
            if (regularSlides.length > 0) {
              setCurrentSlideId(regularSlides[0].id);
              lastUrlSlideIdRef.current = regularSlides[0].id;
            }
            // Mark initial load as complete even on error
            initialLoadCompleteRef.current = true;
          }
        }
      } catch (err) {
        console.error("Failed to fetch slides:", err);
        setError(
          foundTopic.id,
          err instanceof Error ? err.message : "Failed to fetch slides"
        );
        // Mark initial load as complete even on error
        initialLoadCompleteRef.current = true;
      } finally {
        setLoading(foundTopic.id, false);
      }
    };

    fetchTopic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    course,
    topicSlug,
    isCheckingUnlock,
    isTopicUnlocked,
    searchParams, // Only used to read initial slideId inside the function, not reactive
    // slideId intentionally NOT in dependencies - we only read URL on initial load
    // Including it would cause re-runs when URL changes, which resets state
    getSlides,
    getAttempt,
    isSlideUnlocked,
    setTopic,
    setSlides,
    setAttempt,
    setLoading,
    setError,
    router,
    buildSlideUrl,
    currentAttempt,
  ]);

  // Update URL param when currentSlideId changes (one-way: state → URL)
  // This allows bookmarking/sharing but doesn't control navigation
  // Only runs after initial load is complete
  useEffect(() => {
    if (!currentSlideId || isLoading || !foundTopicId) return;
    
    // Don't update URL until initial load is complete
    if (!initialLoadCompleteRef.current) return;
    
    // Skip if we're currently navigating (to avoid circular updates)
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    // Only update URL if it's different from what we last set
    // Don't read from searchParams here - it's reactive and causes issues
    if (lastUrlSlideIdRef.current !== currentSlideId) {
      const targetUrl = buildSlideUrl(currentSlideId);
      if (targetUrl) {
        lastUrlSlideIdRef.current = currentSlideId;
        router.replace(targetUrl, { scroll: false });
      }
    }
  }, [currentSlideId, isLoading, foundTopicId, router, buildSlideUrl]);

  const handleNextSlide = useCallback(() => {
    // Check if next button is disabled (timer active)
    if (isNextDisabled) {
      return;
    }

    // Check if we're on the last slide
    if (currentSlideIndex >= 0 && currentSlideIndex === slides.length - 1) {
      // Mark the current (last) slide as viewed and immediately update progress (no delay)
      if (currentSlideId && foundTopicId && topic && currentAttempt && currentAttempt.status !== "completed") {
        setLocalViewedSlides((prev) => {
          const updated = new Set(prev);
          updated.add(currentSlideId);
          // Immediately call batch update (no delay/debounce) to unlock quiz instantly
          immediateBatchedUpdate(topic.id, currentSlideId, updated);
          return updated;
        });
      }
      // Check for quizzes before showing completion modal
      if (foundTopicId && hasQuizzes === null) {
        setIsLoadingQuiz(true);
        certificationApi.quizzes.list(foundTopicId)
          .then((result) => {
            if (result.data && result.data.length > 0) {
              // Check if any quiz has questions
              Promise.all(
                result.data.map((quiz) =>
                  certificationApi.quizzes.questions.list(quiz.id)
                )
              ).then((questionResults) => {
                const hasQuestions = questionResults.some(
                  (qResult) => qResult.data && qResult.data.length > 0
                );
                setHasQuizzes(hasQuestions);
                setIsLoadingQuiz(false);
                if (hasQuestions) {
                  setShowCompletionModal(true);
                } else {
                  setShowCompletionModal(true);
                }
              });
            } else {
              setHasQuizzes(false);
              setIsLoadingQuiz(false);
              setShowCompletionModal(true);
            }
          })
          .catch((err) => {
            console.error("Failed to check quizzes:", err);
            setHasQuizzes(false);
            setIsLoadingQuiz(false);
            setShowCompletionModal(true);
          });
      } else {
        setShowCompletionModal(true);
      }
      return;
    }

    if (currentSlideIndex >= 0 && currentSlideIndex < slides.length - 1) {
      const nextSlide = slides[currentSlideIndex + 1];
      const isNextSlideLast = currentSlideIndex + 1 === slides.length - 1;

      if (nextSlide && foundTopicId) {
        const slideIds = slides.map((s) => s.id);
        if (
          currentAttempt?.status !== "completed" &&
          !isSlideUnlocked(foundTopicId, nextSlide.id, slideIds)
        ) {
          return;
        }
      }

      // Update UI immediately (optimistic update)
      // URL will be updated automatically by the effect that watches currentSlideId
      isNavigatingRef.current = true;
      setCurrentSlideId(nextSlide.id);

      // Track viewed slide locally and schedule batched update
      // Skip batch update when navigating TO the last slide - it will be called when clicking Next ON the last slide
      if (nextSlide && foundTopicId && topic && currentAttempt && currentAttempt.status !== "completed" && !isNextSlideLast) {
        setLocalViewedSlides((prev) => {
          const updated = new Set(prev);
          updated.add(nextSlide.id);
          // Schedule batched update with updated viewed slides
          scheduleBatchedUpdate(topic.id, nextSlide.id, updated);
          return updated;
        });
      }
    }
  }, [
    currentSlideIndex,
    slides,
    topic,
    currentAttempt,
    currentSlideId,
    foundTopicId,
    isSlideUnlocked,
    scheduleBatchedUpdate,
    immediateBatchedUpdate,
    isNextDisabled,
  ]);

  const handlePrevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      const prevSlide = slides[currentSlideIndex - 1];

      // Update UI immediately (optimistic update)
      // URL will be updated automatically by the effect that watches currentSlideId
      isNavigatingRef.current = true;
      setCurrentSlideId(prevSlide.id);

      // Schedule batched update
      if (
        topic &&
        currentAttempt &&
        prevSlide &&
        currentAttempt.status !== "completed"
      ) {
        scheduleBatchedUpdate(topic.id, prevSlide.id, localViewedSlides);
      }
    }
  }, [
    currentSlideIndex,
    slides,
    topic,
    currentAttempt,
    scheduleBatchedUpdate,
    localViewedSlides,
  ]);

  // Handle quiz navigation
  const handleTakeQuiz = useCallback(async () => {
    if (!topic || !courseNameSlug) return;

    const topicSlug = createSlug(topic.title);
    router.push(`/courses/${courseNameSlug}/${topicSlug}/quiz`);
  }, [topic, courseNameSlug, router]);

  // Handle "Later" navigation to course homepage
  const handleLater = useCallback(() => {
    if (!courseNameSlug) return;
    router.push(`/courses/${courseNameSlug}`);
  }, [courseNameSlug, router]);

  // Fullscreen functionality (for browser fullscreen API)
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        // Update URL with fullscreen query param
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("fullscreen", "true");
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // Remove fullscreen query param
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("fullscreen");
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
    }
  }, [router]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      // Sync query param with actual fullscreen state
      const currentUrl = new URL(window.location.href);
      if (isNowFullscreen) {
        currentUrl.searchParams.set("fullscreen", "true");
      } else {
        currentUrl.searchParams.delete("fullscreen");
      }
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [router]);

  // Sync fullscreen state from query param on mount
  useEffect(() => {
    if (fullscreenParam === "true" && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((error) => {
        console.error("Error entering fullscreen:", error);
      });
    } else if (fullscreenParam !== "true" && document.fullscreenElement) {
      document.exitFullscreen().catch((error) => {
        console.error("Error exiting fullscreen:", error);
      });
    }
  }, [fullscreenParam]);

  // Keyboard navigation
  useEffect(() => {
    if (isLoading || error || !slides.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === "F4" || e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleNextSlide,
    handlePrevSlide,
    toggleFullscreen,
    slides.length,
    isLoading,
    error,
    isFullscreen,
  ]);

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mouse movement detection for controls (only in fullscreen)
  const showControlsWithTimeout = useCallback(() => {
    if (!isFullscreen) {
      setShowControls(true);
      return;
    }
    setShowControls(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, [isFullscreen]);

  useEffect(() => {
    if (isLoading || error || !slides.length) return;

    if (!isFullscreen) {
      setShowControls(true);
      return;
    }

    const handleMouseMove = () => {
      showControlsWithTimeout();
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true, capture: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true, capture: true });
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove, { capture: true });
      window.removeEventListener("mousemove", handleMouseMove, { capture: true });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isLoading, error, slides.length, isFullscreen, showControlsWithTimeout]);


  // Timer logic for new slides (5-second countdown)
  // This effect only runs when currentSlideId changes, not when currentAttempt updates
  useEffect(() => {
    const attempt = currentAttemptRef.current;
    
    if (!currentSlideId || isLoading || !foundTopicId || !attempt) {
      // Reset timer state when conditions aren't met
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      timedSlideIdRef.current = null;
      setIsNextDisabled(false);
      setNewSlideTimer(null);
      return;
    }

    // If we're already timing this slide, don't reset (this prevents reset when currentAttempt updates)
    if (timedSlideIdRef.current === currentSlideId && timerIntervalRef.current) {
      return;
    }

    // Clear any existing timer for a different slide
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Check if this is a new slide using local state (client-side only)
    const isNewSlide = !localViewedSlides.has(currentSlideId);

    if (isNewSlide && attempt.status !== "completed") {
      // Track that we're timing this slide
      timedSlideIdRef.current = currentSlideId;
      
      // Start 5-second countdown timer
      setIsNextDisabled(true);
      setNewSlideTimer(5);

      timerIntervalRef.current = setInterval(() => {
        setNewSlideTimer((prev) => {
          if (prev === null || prev <= 1) {
            setIsNextDisabled(false);
            timedSlideIdRef.current = null;
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Already viewed or completed, allow immediate navigation
      timedSlideIdRef.current = null;
      setIsNextDisabled(false);
      setNewSlideTimer(null);
    }

    // Cleanup on unmount or when slide changes
    return () => {
      // Only cleanup if we're moving to a different slide
      if (timedSlideIdRef.current !== currentSlideId && timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [
    currentSlideId, // Only run when slide ID changes
    isLoading,
    foundTopicId,
    currentAttempt?.status,
    localViewedSlides, // Use local state to check if slide is new
  ]);

  // Initialize localViewedSlides from server state when attempt loads
  useEffect(() => {
    if (currentAttempt?.slideProgress && foundTopicId) {
      const slideProgress = currentAttempt.slideProgress as Record<string, any>;
      const viewedSlides = new Set<string>();
      Object.keys(slideProgress).forEach((slideId) => {
        if (slideProgress[slideId]?.viewed) {
          viewedSlides.add(slideId);
        }
      });
      setLocalViewedSlides(viewedSlides);
    }
  }, [currentAttempt?.slideProgress, foundTopicId]);

  // Cleanup batch update timeout on unmount
  useEffect(() => {
    return () => {
      if (batchUpdateTimeoutRef.current) {
        clearTimeout(batchUpdateTimeoutRef.current);
        batchUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  // Redirect countdown timer effect
  useEffect(() => {
    // Clear any existing countdown when dialog closes
    if (!showLockedDialog) {
      if (redirectCountdownRef.current) {
        clearInterval(redirectCountdownRef.current);
        redirectCountdownRef.current = null;
      }
      setRedirectCountdown(null);
      return;
    }

    // Start countdown when dialog opens
    setRedirectCountdown(5);

    redirectCountdownRef.current = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // Countdown reached 0, stop the timer
          if (redirectCountdownRef.current) {
            clearInterval(redirectCountdownRef.current);
            redirectCountdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount or when dialog closes
    return () => {
      if (redirectCountdownRef.current) {
        clearInterval(redirectCountdownRef.current);
        redirectCountdownRef.current = null;
      }
    };
  }, [showLockedDialog]);

  // Handle automatic redirect when countdown reaches 0
  useEffect(() => {
    if (redirectCountdown === 0 && showLockedDialog && courseNameSlug) {
      setIsRedirecting(true);
      router.push(`/courses/${courseNameSlug}`);
    }
  }, [redirectCountdown, showLockedDialog, courseNameSlug, router]);

  // Show loading while checking unlock status
  if (isCheckingUnlock) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If topic is locked, don't render slides - dialog will handle it
  if (isTopicUnlocked === false) {
    return (
      <>
        {/* Locked Topic Dialog */}
        <Dialog open={showLockedDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" showCloseButton={false}>
            <DialogHeader>
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="rounded-full bg-destructive/10 p-3">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <DialogTitle className="text-2xl text-center">
                  Topic Locked
                </DialogTitle>
                <DialogDescription className="text-center text-base">
                  You haven't unlocked these slides yet!
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button
                onClick={() => {
                  // Clear countdown timer
                  if (redirectCountdownRef.current) {
                    clearInterval(redirectCountdownRef.current);
                    redirectCountdownRef.current = null;
                  }
                  setRedirectCountdown(null);
                  // Redirect immediately
                  setIsRedirecting(true);
                  router.push(`/courses/${courseNameSlug}`);
                }}
                disabled={isRedirecting}
                className="w-full"
                size="lg"
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : redirectCountdown !== null && redirectCountdown > 0 ? (
                  `Back to Course (${redirectCountdown})`
                ) : (
                  "Back to Course"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

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

  const canGoPrev = currentSlideIndex > 0;
  const nextSlide =
    currentSlideIndex >= 0 && currentSlideIndex < slides.length - 1
      ? slides[currentSlideIndex + 1]
      : null;
  const slideIdsForNav = slides.map((s) => s.id);
  const isLastSlide = currentSlideIndex >= 0 && currentSlideIndex === slides.length - 1;
  const canGoNext =
    !isNextDisabled &&
    (isLastSlide ||
      (nextSlide !== null &&
        (isCompleted ||
          !nextSlide ||
          (foundTopicId &&
            isSlideUnlocked(foundTopicId, nextSlide.id, slideIdsForNav)))));

  return (
    <div
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden px-0",
        isFullscreen && "fixed inset-0 z-50",
        isFullscreen && !showControls && "cursor-none"
      )}
      onMouseMove={isFullscreen ? showControlsWithTimeout : undefined}
    >
      {isFullscreen ? (
        <>
          {/* Fullscreen: Overlay header - appears when controls are visible */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 transition-all duration-300 ease-in-out z-50 px-0",
              showControls
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-4 pointer-events-none"
            )}
          >
            <div className="absolute left-1/2 top-0 -translate-x-1/2 flex items-center gap-2">
              {/* Topic title - separate tab */}
              <div className="px-6 py-3 h-12 bg-background border border-border rounded-b-lg shadow-sm flex items-center gap-4">
                <p className="text-foreground text-sm font-medium">
                  {topic.title}
                </p>
                <span className="text-muted-foreground text-xs">
                  {currentDateTime.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {currentDateTime.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>

              {/* Fullscreen button - separate tab */}
              <div className="px-6 py-3 h-12 bg-background border border-border rounded-b-lg shadow-sm flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-foreground hover:bg-foreground/20 flex items-center gap-2"
                >
                  <Minimize className="h-4 w-4" />
                  <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    Esc
                  </kbd>
                  <span className="text-sm">Exit Fullscreen</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Fullscreen: Main slide display */}
          <div className="w-screen h-screen flex items-center justify-center relative">
            {slides.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    No slides available for this topic.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative bg-muted overflow-hidden w-full h-full rounded-none">
                {slides.map((slide) => (
                  <div
                    key={slide.id}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-300",
                      currentSlideId === slide.id
                        ? "opacity-100 z-10"
                        : "opacity-0 z-0 pointer-events-none"
                    )}
                  >
                    <SlideRenderer
                      slide={slide}
                      className="w-full h-full"
                      isCertification={true}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen: Overlay bottom controls - appears when controls are visible */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 transition-all duration-300 ease-in-out z-50",
              showControls
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 px-8 py-4 flex items-center justify-center bg-background border border-border rounded-lg shadow-sm">
              {/* Center - Navigation buttons and slide counter */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevSlide}
                  disabled={!canGoPrev}
                  className="text-foreground hover:bg-foreground/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ←
                  </kbd>
                  <span className="text-sm">Previous</span>
                </Button>

                <div className="text-foreground text-sm font-medium text-center min-w-[80px]">
                  {currentSlideIndex >= 0 ? currentSlideIndex + 1 : 0} / {slides.length}
                </div>

                <div className="relative flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextSlide}
                    disabled={!canGoNext}
                    className="text-foreground hover:bg-foreground/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      →
                    </kbd>
                    <span className="text-sm">Next</span>
                  </Button>
                  {newSlideTimer !== null && newSlideTimer > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 ease-linear rounded-full"
                        style={{
                          width: `${((5 - newSlideTimer) / 5) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Non-fullscreen: Card layout with header and footer */}
          <Card className="w-full max-w-5xl mx-auto overflow-hidden bg-muted">
            {/* Header - always visible, tight spacing */}
            <div className="px-6 py-0 flex items-center justify-between h-auto min-h-[60px]">
              <div className="flex flex-col gap-1 h-full justify-center flex-[0.6] min-w-0">
                {/* Course name - small label above */}
                {course && (
                  <p className="text-xs text-muted-foreground">
                    {course.name}
                  </p>
                )}
                {/* Topic title with badge */}
                <div className="flex items-center gap-2 min-w-0">
                  {topic.courseOrder !== null && topic.courseOrder !== undefined && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
                    >
                      T{topic.courseOrder}
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-foreground text-2xl font-semibold truncate min-w-0">
                        {topic.title}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{topic.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-foreground hover:bg-foreground/20 flex items-center gap-2 h-full flex-shrink-0"
              >
                <Maximize className="h-4 w-4" />
                <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  F4
                </kbd>
                <span className="text-base">Fullscreen</span>
              </Button>
            </div>

            {/* Slide display - full width, no side padding, no gap */}
            <CardContent className="p-0">
              {slides.length === 0 ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <p className="text-sm text-muted-foreground">
                    No slides available for this topic.
                  </p>
                </div>
              ) : (
                <div className="relative bg-muted overflow-hidden aspect-video w-full">
                  {slides.map((slide) => (
                    <div
                      key={slide.id}
                      className={cn(
                        "absolute inset-0 transition-opacity duration-300",
                        currentSlideId === slide.id
                          ? "opacity-100 z-10"
                          : "opacity-0 z-0 pointer-events-none"
                      )}
                    >
                      <SlideRenderer
                        slide={slide}
                        className="w-full h-full"
                        isCertification={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Footer - always visible with controls, tight spacing */}
            <div className="px-6 py-0 flex items-center justify-center">
              <div className="flex items-center gap-4 h-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevSlide}
                  disabled={!canGoPrev}
                  className="text-foreground hover:bg-foreground/20 disabled:opacity-50 flex items-center gap-2 h-full"
                >
                  <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ←
                  </kbd>
                  <span className="text-base">Previous</span>
                </Button>

                <div className="text-foreground text-base font-medium text-center min-w-[80px]">
                  {currentSlideIndex >= 0 ? currentSlideIndex + 1 : 0} / {slides.length}
                </div>

                <div className="relative flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextSlide}
                    disabled={!canGoNext}
                    className="text-foreground hover:bg-foreground/20 disabled:opacity-50 flex items-center gap-2 h-full"
                  >
                    <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      →
                    </kbd>
                    <span className="text-base">Next</span>
                  </Button>
                  {newSlideTimer !== null && newSlideTimer > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 ease-linear rounded-full"
                        style={{
                          width: `${((5 - newSlideTimer) / 5) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Locked Topic Dialog */}
      <Dialog open={showLockedDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <DialogTitle className="text-2xl text-center">
                Topic Locked
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                You haven't unlocked these slides yet?
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => {
                // Clear countdown timer
                if (redirectCountdownRef.current) {
                  clearInterval(redirectCountdownRef.current);
                  redirectCountdownRef.current = null;
                }
                setRedirectCountdown(null);
                // Redirect immediately
                setIsRedirecting(true);
                router.push(`/courses/${courseNameSlug}`);
              }}
              disabled={isRedirecting}
              className="w-full"
              size="lg"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : redirectCountdown !== null && redirectCountdown > 0 ? (
                `Back to Course (${redirectCountdown})`
              ) : (
                "Back to Course"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl text-center">
                Congratulations!
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                {hasQuizzes === null
                  ? isLoadingQuiz
                    ? "Checking for quizzes..."
                    : "You finished this topic!"
                  : hasQuizzes
                  ? "You finished this topic. Would you like to take the quiz now?"
                  : "You finished this topic!"}
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {hasQuizzes === true && (
              <Button
                onClick={handleTakeQuiz}
                disabled={isLoadingQuiz}
                size="lg"
                className="w-full"
              >
                {isLoadingQuiz ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Take Quiz"
                )}
              </Button>
            )}
            <Button
              onClick={handleLater}
              variant={hasQuizzes === true ? "ghost" : "default"}
              size="lg"
              className="w-full"
              disabled={isLoadingQuiz}
            >
              {hasQuizzes === true ? "Later" : "Return to Course"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CourseTopicSlidesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CourseTopicSlidesPageContent />
    </Suspense>
  );
}
