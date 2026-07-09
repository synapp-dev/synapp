"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { lessonsKeys } from "@/entities/lessons/model/keys";
import { topicsApi } from "@/entities/topics/api/endpoints";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@workspace/ui/components/drawer";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { LessonWizardClasses } from "./lesson-wizard-classes";
import { LessonWizardRecommendation } from "./lesson-wizard-recommendation";
import { LessonWizardTopic } from "./lesson-wizard-topic";
import { LessonWizardConfirm } from "./lesson-wizard-confirm";
import { LessonCard, type Lesson } from "@/entities/lessons/ui/lesson-card";
import type { ClassOption, TopicOption } from "@/types/lesson-wizard";
import {
  WIZARD_TOTAL_STEPS,
  buildCreateLessonPayload,
  canProceedFromWizardStep,
  clampWizardStep,
  initialWizardState,
} from "@/entities/lessons/lesson-creation";
import {
  ChevronLeft,
  ChevronsRight,
  Loader2,
  BookOpen,
  Play,
  Check,
  Info,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card";
import { schoolApi } from "@/entities/school/api/endpoints";
import { Separator } from "@workspace/ui/components/separator";
import { Alert, AlertTitle } from "@workspace/ui/components/alert";
import { classesApi } from "@/entities/classes/api/endpoints";
import { useLessonAccess } from "@/hooks/use-lesson-access";

interface LessonWizardProps {
  schoolId: string; // This is actually the school slug from the URL
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LessonWizard({
  schoolId,
  open,
  onOpenChange,
}: LessonWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolUuid, setSchoolUuid] = useState<string | null>(null);

  // Fetch school UUID from slug
  useEffect(() => {
    if (!schoolId) return;

    schoolApi.get
      .schoolBySlug(schoolId)
      .then((result) => {
        if (result.error || !result.data) {
          console.error("Failed to fetch school:", result.error);
          setError("Failed to load school information");
        } else {
          setSchoolUuid(result.data.id);
        }
      })
      .catch((err) => {
        console.error("Error fetching school:", err);
        setError("Failed to load school information");
      });
  }, [schoolId]);

  const [state, setState] = useState(initialWizardState);
  const [shouldPreSelectTopic, setShouldPreSelectTopic] = useState(false);
  const [shouldFetchRecommendations, setShouldFetchRecommendations] = useState(false);
  const [skippedStep3, setSkippedStep3] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [onBehalfOfUserId, setOnBehalfOfUserId] = useState<string | null>(null);
  const [showFeedbackGate, setShowFeedbackGate] = useState(false);

  const { isAdminRestrictedForCreate: isAdminRestricted } = useLessonAccess(
    schoolUuid ?? undefined
  );

  // Ref to track if we're intentionally closing the drawer (to prevent URL sync loop)
  const isIntentionallyClosingRef = useRef(false);
  
  // Ref to track if we're navigating to step 4 from recommendation (to prevent step reset)
  const isNavigatingToConfirmRef = useRef(false);
  
  // Ref to track if we're redirecting after lesson creation (to prevent URL sync)
  const isRedirectingAfterCreationRef = useRef(false);
  
  // Ref to track if we've initialized state from URL params (only restore on initial load)
  const hasInitializedFromUrlRef = useRef(false);

  // Memoize class IDs for query key
  const classIds = useMemo(
    () => state.selectedClasses.map((c) => c.id),
    [state.selectedClasses]
  );
  const classIdsString = useMemo(() => classIds.join(","), [classIds]);

  // Fetch recommendations using React Query (only when shouldFetchRecommendations is true AND we're on step 2)
  // IMPORTANT: Always fetch fresh data - never use cache for recommendations
  // because users could proceed with stale data and create the wrong lesson
  const {
    data: recommendationData,
    isLoading: isLoadingRecommendation,
    isFetching: isFetchingRecommendation,
  } = useQuery({
    queryKey: ["lesson-recommendations", classIdsString],
    queryFn: async () => {
      if (classIds.length === 0) return null;
      
      const result = await lessonsApi.get.recommendations({ classIds });
      if (result.error) {
        console.error("Failed to fetch recommendations:", result.error);
        throw new Error(result.error.message || "Failed to fetch recommendations");
      }
      return result.data;
    },
    enabled: shouldFetchRecommendations && classIds.length > 0 && state.step === 2,
    // Never use cached data for recommendations - always fetch fresh
    staleTime: 0, // Data is immediately stale
    gcTime: 0, // Don't keep old data in cache
    refetchOnMount: "always", // Always refetch when component mounts
  });
  
  // For recommendations, we show loading state if fetching (even if we have cached data)
  // This ensures users never see stale recommendations they could accidentally proceed with
  const isRecommendationLoading = isLoadingRecommendation || isFetchingRecommendation;

  // Fetch outstanding feedback lessons - gate for starting new lessons
  const {
    data: outstandingFeedbackLessons = [],
    refetch: refetchOutstandingFeedback,
  } = useQuery({
    queryKey: ["outstanding-feedback-lessons"],
    queryFn: async () => {
      const result = await lessonsApi.get.outstandingFeedback();
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to fetch outstanding feedback");
      }
      return result.data ?? [];
    },
    enabled: open,
    staleTime: 0, // Always fresh - user may have just completed feedback
  });

  // Reset state when drawer closes to ensure clean state on next open
  useEffect(() => {
    if (!open) {
      setState(initialWizardState());
      setError(null);
      setLoading(false);
      setShouldPreSelectTopic(false);
      setShouldFetchRecommendations(false);
      setSkippedStep3(false);
      setSelectedStageId(null);
      setOnBehalfOfUserId(null);
      setShowFeedbackGate(false);
      // Reset initialization flag so we can restore from URL on next open
      hasInitializedFromUrlRef.current = false;
      // Reset redirect flag
      isRedirectingAfterCreationRef.current = false;
    }
  }, [open]);

  // URL sync helper function
  const updateUrlParams = useMemo(() => {
    return (updates: {
      wizardOpen?: boolean;
      step?: number;
      classes?: string[];
      topicId?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (updates.wizardOpen !== undefined) {
        if (updates.wizardOpen) {
          params.set('wizardOpen', 'true');
        } else {
          params.delete('wizardOpen');
        }
      }
      
      if (updates.step !== undefined) {
        params.set('step', updates.step.toString());
      }
      
      if (updates.classes !== undefined) {
        if (updates.classes.length > 0) {
          params.set('classes', updates.classes.join(','));
        } else {
          params.delete('classes');
        }
      }
      
      if (updates.topicId !== undefined) {
        if (updates.topicId) {
          params.set('topicId', updates.topicId);
        } else {
          params.delete('topicId');
        }
      }
      
      router.replace(`${pathname}?${params.toString()}`);
    };
  }, [searchParams, pathname, router]);

  // Clear all wizard-related query params
  const clearWizardParams = useMemo(() => {
    return () => {
      const params = new URLSearchParams(searchParams.toString());
      
      // Remove all wizard-related params
      params.delete('wizardOpen');
      params.delete('step');
      params.delete('classes');
      params.delete('topicId');
      
      // Update URL without wizard params
      const newUrl = params.toString() 
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(newUrl);
    };
  }, [searchParams, pathname, router]);

  // Wrapper for onOpenChange that clears params when closing
  const handleOpenChange = useMemo(() => {
    return (newOpen: boolean) => {
      // If closing, mark as intentional close and clear params
      if (!newOpen) {
        isIntentionallyClosingRef.current = true;
        // Clear params first, then close drawer
        clearWizardParams();
        onOpenChange(false);
        // Reset the flag after URL update completes (router.replace is async)
        setTimeout(() => {
          isIntentionallyClosingRef.current = false;
        }, 200);
      } else {
        // Opening - reset flag and call onOpenChange
        isIntentionallyClosingRef.current = false;
        onOpenChange(true);
      }
    };
  }, [onOpenChange, clearWizardParams]);

  // Initialize state from URL params ONLY on initial load (not continuously)
  useEffect(() => {
    // Only restore from URL on initial load, not on every URL change
    if (hasInitializedFromUrlRef.current) {
      return;
    }
    
    // Skip URL sync if we're intentionally closing the drawer
    if (isIntentionallyClosingRef.current) {
      return;
    }
    
    const wizardOpen = searchParams.get('wizardOpen') === 'true';
    const stepParam = searchParams.get('step');
    const classesParam = searchParams.get('classes');
    const topicIdParam = searchParams.get('topicId');
    
    // If drawer is closed and there are no wizard params, mark as initialized and return
    if (!open && !wizardOpen && !stepParam && !classesParam && !topicIdParam) {
      hasInitializedFromUrlRef.current = true;
      return;
    }
    
    // Restore drawer open state from URL
    if (wizardOpen && !open) {
      onOpenChange(true);
    }
    
    // Restore step from URL (only if state doesn't have a step set)
    if (stepParam && state.step === 0) {
      const step = parseInt(stepParam, 10);
      if (step >= 0 && step <= 4) {
        setState(prev => ({ ...prev, step }));
      }
    }
    
    // Restore classes from URL (only if state doesn't have classes)
    if (classesParam && state.selectedClasses.length === 0 && schoolUuid) {
      const classIdArray = classesParam.split(',').filter(id => id.trim() !== '');
      if (classIdArray.length > 0) {
        classesApi.get.list({ schoolId: schoolUuid, active: true })
          .then((result) => {
            if (!result.error && result.data) {
              const allClasses = result.data;
              const selectedClassesData = classIdArray
                .map(classId => {
                  const classData = allClasses.find(c => c.id === classId);
                  if (classData) {
                    return {
                      id: classData.id,
                      name: classData.name,
                      yearLevel: (classData as any).yearCodes?.join(", ") || classData.code || "N/A",
                      schoolId: classData.schoolId,
                    } as ClassOption;
                  }
                  return null;
                })
                .filter((c): c is ClassOption => c !== null);
              
              if (selectedClassesData.length > 0) {
                setState(prev => ({
                  ...prev,
                  selectedClasses: selectedClassesData,
                }));
                // Trigger recommendations fetch if on step 2
                const stepParam = searchParams.get('step');
                if (stepParam && parseInt(stepParam, 10) === 2) {
                  setShouldFetchRecommendations(true);
                }
              }
            }
            // Mark as initialized after attempting to restore
            hasInitializedFromUrlRef.current = true;
          })
          .catch((err) => {
            console.error("Failed to fetch classes from URL:", err);
            hasInitializedFromUrlRef.current = true;
          });
        return; // Don't mark as initialized yet, wait for async operation
      }
    }
    
    // Restore topic from URL (only if state doesn't have a topic)
    if (topicIdParam && !state.selectedTopic) {
      topicsApi.get.byId(topicIdParam, { includeSlides: false, includeUrls: false })
        .then((result) => {
          if (!result.error && result.data) {
            const topicData = result.data;
            setState(prev => ({
              ...prev,
              selectedTopic: {
                id: topicData.id,
                title: topicData.title,
                stageCode: (topicData.stage as any)?.code || "",
                stageName: (topicData.stage as any)?.name || "",
                slideCount: topicData.slides?.length || 0,
                description: topicData.officialNotes || topicData.title,
              },
            }));
          }
          // Mark as initialized after attempting to restore
          hasInitializedFromUrlRef.current = true;
        })
        .catch((err) => {
          console.error("Failed to fetch topic from URL:", err);
          hasInitializedFromUrlRef.current = true;
        });
      return; // Don't mark as initialized yet, wait for async operation
    }
    
    // Mark as initialized if no async operations needed
    hasInitializedFromUrlRef.current = true;
  }, [searchParams, open, schoolUuid, onOpenChange, state.step, state.selectedClasses.length, state.selectedTopic]);

  // Check if we're on step 2 or later without classes and navigate back
  useEffect(() => {
    if (!open) return;
    
    // Don't reset step if we're intentionally navigating to confirmation
    if (isNavigatingToConfirmRef.current) {
      return;
    }
    
    // If on step 2 or later without classes, go back to step 1
    // Update state - the useEffect will sync to URL
    if ((state.step === 2 || state.step === 3 || state.step === 4) && state.selectedClasses.length === 0) {
      setState(prev => ({ ...prev, step: 1 }));
    }
  }, [open, state.step, state.selectedClasses.length]);

  // Sync state changes to URL
  useEffect(() => {
    if (!open) return; // Don't update URL when wizard is closed
    if (isRedirectingAfterCreationRef.current) return; // Don't update URL when redirecting after lesson creation
    
    updateUrlParams({
      wizardOpen: open,
      step: state.step,
      classes: state.selectedClasses.map(c => c.id),
      topicId: state.selectedTopic?.id || null,
    });
  }, [open, state.step, state.selectedClasses, state.selectedTopic, updateUrlParams]);

  // Add floating animation style
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const totalSteps = WIZARD_TOTAL_STEPS;

  const goToStep = (step: number) => {
    const newStep = clampWizardStep(step);
    // Update state - this is the source of truth
    // The useEffect will automatically sync to URL after state updates
    setState((prev) => ({
      ...prev,
      step: newStep,
    }));
    setError(null);
    
    // If moving to step 2, trigger recommendations fetch
    if (newStep === 2 && state.step === 1) {
      setShouldFetchRecommendations(true);
    }
    
    // If navigating to step 3 normally (not from going back), reset skipped flag
    if (newStep === 3 && state.step !== 4) {
      setSkippedStep3(false);
    }
  };

  const goNext = () => {
    if (canProceed()) {
      goToStep(state.step + 1);
    }
  };

  const goBack = () => {
    // If going back from step 4 and we skipped step 3, go back to step 2 (recommendation)
    if (state.step === 4 && skippedStep3) {
      setSkippedStep3(false);
      goToStep(2);
      return;
    }
    goToStep(state.step - 1);
  };

  const canProceed = () =>
    canProceedFromWizardStep({
      step: state.step,
      state,
      recommendation: recommendationData,
      selectedStageId,
      isAdminRestricted,
      onBehalfOfUserId,
    });

  const handleOptionSelect = async (option: "teach" | "view") => {
    if (loading) return;
    if (option === "view") {
      if (!schoolId) return;
      // Prevent the URL-restore useEffect from reopening the drawer
      isIntentionallyClosingRef.current = true;
      onOpenChange(false);
      // Replace URL to content (wipes wizard params) and navigate in one go
      router.replace(`/schools/${schoolId}/content`);
      setTimeout(() => {
        isIntentionallyClosingRef.current = false;
      }, 300);
    } else {
      // Wait for feedback check to resolve before allowing user to proceed
      setLoading(true);
      try {
        const { data } = await refetchOutstandingFeedback();
        const needsFeedback = (data ?? []).length > 0;
        if (needsFeedback) {
          setShowFeedbackGate(true);
        } else {
          goToStep(1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check outstanding feedback");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleProceedWithRecommendation = async () => {
    const hasMultipleStages = recommendationData?.warning?.multipleStages && recommendationData.warning.multipleStages.length > 1;
    
    // If multiple stages detected and a stage is selected, check if there's a recommended topic for that stage
    if (hasMultipleStages && selectedStageId) {
      // Find the selected stage's firstTopic
      const selectedStageOption = recommendationData.warning.multipleStages?.find(
        (stage) => stage.stageId === selectedStageId
      );
      
      // If there's a recommended topic for the selected stage, proceed directly to confirmation
      if (selectedStageOption?.firstTopic?.id) {
        setLoading(true);
        setError(null);

        try {
          // Fetch the full topic data (include slides to get accurate slide count)
          const result = await topicsApi.get.byId(selectedStageOption.firstTopic.id, {
            includeSlides: true,
            includeUrls: false,
          });

          if (result.error || !result.data) {
            throw new Error(result.error?.message || "Failed to fetch topic data");
          }

          const topicData = result.data;

          // Transform to TopicOption format
          const topicOption: TopicOption = {
            id: topicData.id,
            title: topicData.title,
            stageCode: (topicData.stage as any)?.code || "",
            stageName: (topicData.stage as any)?.name || "",
            slideCount: topicData.slides?.length || 0,
            description: topicData.officialNotes || topicData.title,
          };

          // Mark that we skipped step 3
          setSkippedStep3(true);
          setError(null);
          
          // Ensure we have classes before proceeding
          if (state.selectedClasses.length === 0) {
            setError("No classes selected");
            setLoading(false);
            return;
          }
          
          // Set flag to prevent step reset useEffect from interfering
          isNavigatingToConfirmRef.current = true;
          
          // Update state - this is the source of truth
          // The useEffect will automatically sync to URL after state updates
          setState((prev) => ({
            ...prev,
            selectedTopic: topicOption,
            step: 4,
          }));
          
          // Reset flag after a short delay to allow state to settle
          setTimeout(() => {
            isNavigatingToConfirmRef.current = false;
          }, 100);
        } catch (err: any) {
          console.error("Failed to fetch topic:", err);
          setError(err.message || "Failed to load recommended lesson. Please try again.");
        } finally {
          setLoading(false);
        }
        return;
      } else {
        // No recommended topic for selected stage, navigate to topic selection
        setShouldPreSelectTopic(false);
        goToStep(3);
        return;
      }
    }

    if (!recommendationData?.recommendedTopicId) {
      setError("No recommended lesson available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch the full topic data (include slides to get accurate slide count)
      const result = await topicsApi.get.byId(recommendationData.recommendedTopicId, {
        includeSlides: true,
        includeUrls: false,
      });

      if (result.error || !result.data) {
        throw new Error(result.error?.message || "Failed to fetch topic data");
      }

      const topicData = result.data;

      // Transform to TopicOption format
      const topicOption: TopicOption = {
        id: topicData.id,
        title: topicData.title,
        stageCode: (topicData.stage as any)?.code || "",
        stageName: (topicData.stage as any)?.name || "",
        slideCount: topicData.slides?.length || 0,
        description: topicData.officialNotes || topicData.title,
      };

      // Mark that we skipped step 3
      setSkippedStep3(true);
      setError(null);
      
      // Ensure we have classes before proceeding
      if (state.selectedClasses.length === 0) {
        setError("No classes selected");
        setLoading(false);
        return;
      }
      
      // Set flag to prevent step reset useEffect from interfering
      isNavigatingToConfirmRef.current = true;
      
      // Update state - this is the source of truth
      // The useEffect will automatically sync to URL after state updates
      setState((prev) => ({
        ...prev,
        selectedTopic: topicOption,
        step: 4,
      }));
      
      // Reset flag after a short delay to allow state to settle
      setTimeout(() => {
        isNavigatingToConfirmRef.current = false;
      }, 100);
    } catch (err: any) {
      console.error("Failed to fetch topic:", err);
      setError(err.message || "Failed to load recommended lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStage = (stageId: string) => {
    setSelectedStageId(stageId);
  };

  const createLessonAndRedirect = async (
    status: "preparing" | "ready",
    redirectPath: "prepare" | "run-lesson"
  ) => {
    if (!canProceed() || !state.selectedTopic || !schoolUuid) {
      if (!schoolUuid) {
        setError("School information not loaded. Please try again.");
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = buildCreateLessonPayload({
        schoolId: schoolUuid,
        topicId: state.selectedTopic.id,
        classIds: state.selectedClasses.map((c) => c.id),
        status,
        onBehalfOfUserId,
      });

      const result = await lessonsApi.post.create(payload);

      if (result.error) {
        throw new Error(result.error.message || "Failed to create lesson");
      }

      if (!result.data) {
        throw new Error("No data returned from API");
      }

      const lessonId = result.data.id;

      if (!lessonId) {
        console.error("Lesson creation response:", result.data);
        throw new Error("Lesson ID (UUID) not returned from API. Please try again.");
      }

      queryClient.invalidateQueries({ queryKey: lessonsKeys.all() });
      queryClient.invalidateQueries({ queryKey: ["lesson-recommendations"] });

      // Hard redirect - full page navigation wipes all state, params, and wizard
      const url = `/schools/${schoolId}/lessons/${lessonId}/${redirectPath}`;
      const fullUrl = redirectPath === "run-lesson" ? `${url}?dialog=present` : url;
      window.location.replace(fullUrl);
    } catch (err: any) {
      console.error("Failed to create lesson:", err);
      setError(err.message || "Failed to create lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareLesson = () =>
    createLessonAndRedirect("preparing", "prepare");

  const handleStartLesson = () =>
    createLessonAndRedirect("ready", "run-lesson");

  const getStepTitle = () => {
    switch (state.step) {
      case 0:
        return "Get Started!";
      case 1:
        return "Select Class/Classes";
      case 2:
        return "Recommendation";
      case 3:
        return "Choose Lesson";
      case 4:
        return "Confirm";
      default:
        return "Create Lesson";
    }
  };

  const getDisplayedStepNumber = () => {
    // If we're on step 4 and skipped step 3, display as step 4 instead of 5
    if (state.step === 4 && skippedStep3) {
      return 4;
    }
    return state.step + 1;
  };

  const getStepProgress = () => {
    // If we skipped step 3, adjust the total steps for progress calculation
    const effectiveTotalSteps = skippedStep3 && state.step === 4 ? 4 : totalSteps;
    // Use displayed step number to account for skipped steps
    const displayedStep = getDisplayedStepNumber();
    // Step 1 = 0%, Step 2 = 25%, Step 3 = 50%, Step 4 = 75%
    // We only show progress for steps > 0, so step 1 (index 1) = 25%, step 2 (index 2) = 50%, step 3 (index 3) = 75%
    // if (state.step === 0) return 0;
    return (displayedStep / effectiveTotalSteps) * 100;
  };

  const getStepDescription = () => {
    switch (state.step) {
      case 0:
        return "What would you like to do?";
      case 1:
        return "Choose the class or classes for this lesson. Please try to avoid selecting two or more classes who are on different levels.";
      case 2:
        return "Review the recommended lesson for your selected class/classes.";
      case 3:
        return "Select the lesson content you want to teach";
      case 4:
        return "Review your selections before creating";
      default:
        return "";
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="top">
      <DrawerContent className="h-[90vh] w-fit mx-auto bg-transparent border-none shadow-none px-4 pb-4 pt-0 !mt-0">
        <DrawerTitle className="sr-only">Create Lesson</DrawerTitle>
        <div className="flex gap-4 h-full justify-center">
          {/* Main Content Area */}
          <div className="flex flex-col min-w-0 w-xl bg-transparent">
            <div className="bg-background border border-border rounded-lg shadow-lg flex flex-col h-full rounded-t-none">
              <div className="p-0 bg-muted relative">
                <div className="flex items-start justify-between py-6 px-8">
                  <div className="flex flex-col text-left gap-0 items-start">
                    <h2 className="text-2xl font-semibold flex items-center">
                      {getStepTitle()}
                    </h2>
                    <p className="text-sm text-muted-foreground">{getStepDescription()}</p>
                  </div>
                </div>
                {/* {state.step > 0 && ( */}
                  <div className="mt-0 w-full">
                    <Progress 
                      value={getStepProgress()} 
                      className="h-1.5" 
                      indicatorStyle={{ backgroundColor: "var(--brand-bullyproof-primary)" }}
                    />
                  </div>
                {/* )} */}
              </div>

                  <div className="flex-1 overflow-auto p-6">
                <div className="max-w-3xl mx-auto">
            {/* Always render all step components to maintain consistent hook order */}
            {/* Hide inactive steps using CSS to prevent hook order issues */}

            {/* Step 0: Outstanding feedback gate - shown after clicking Prepare & Teach when feedback required */}
            {state.step === 0 && showFeedbackGate ? (
              <div className="flex flex-col gap-6 items-center">
                <Alert className="w-full bg-purple-50 border-purple-300 text-purple-900">
                  <Info className="h-4 w-4 text-purple-600" />
                  <AlertTitle className="text-purple-900">
                    Feedback required before starting another lesson
                  </AlertTitle>
                </Alert>
                <div className="flex flex-col gap-6 items-center w-full">
                  {outstandingFeedbackLessons.map((lesson) => {
                    const feedbackHref = lesson.schoolSlug
                      ? `/schools/${lesson.schoolSlug}/lessons/${lesson.id}/feedback`
                      : `/schools/${schoolId}/lessons/${lesson.id}/feedback`;
                    const lessonForCard: Lesson = {
                      id: lesson.id,
                      schoolId: lesson.schoolId,
                      topicId: lesson.topicId,
                      createdByUserId: null,
                      status: "feedback",
                      scheduledFor: null,
                      createdAt: lesson.createdAt,
                      topic: { title: lesson.topicTitle },
                      teacher: lesson.teacher ?? undefined,
                      assignedClasses: lesson.assignedClasses ?? undefined,
                    };
                    return (
                      <div key={lesson.id} className="flex flex-col gap-2 w-2/3 min-w-[240px]">
                        <LessonCard
                          lesson={lessonForCard}
                          schoolSlug={lesson.schoolSlug ?? schoolId}
                          displayOnly
                        />
                        <Button
                          asChild
                          className="w-full bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 gap-1"
                        >
                          <Link href={feedbackHref} replace>
                            Go to lesson
                            <ChevronsRight className="h-4 w-4 shrink-0 [animation:var(--animate-bounce-right)]" />
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
            /* Step 0: Initial option selection (Teach vs View) */
            <div className={state.step === 0 ? "block" : "hidden"}>
              <div className="flex flex-col gap-4 max-w-2xl">
                <Card
                  className={`relative transition-all text-left gap-0 shadow-lg group/prepare-card ${
                    loading
                      ? "cursor-wait opacity-70"
                      : "hover:shadow-md cursor-pointer duration-150 hover:scale-[101%] text-[var(--brand-bullyproof-primary)] hover:bg-[var(--brand-bullyproof-primary)] hover:border-[var(--brand-bullyproof-primary)]"
                  }`}
                  onClick={() => handleOptionSelect("teach")}
                >
                  {loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  <CardHeader className="text-left">
                    <div className="flex items-center gap-2">
                      <Play className="h-6 w-6 group-hover/prepare-card:text-secondary group-hover/prepare-card:animate-bounce-right-subtle transition-colors" />
                      <CardTitle className="text-3xl group-hover/prepare-card:text-secondary transition-colors">Prepare & Teach Lesson</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-base font-light group-hover/prepare-card:text-secondary transition-colors">
                    Set up a lesson to <span className="font-medium">deliver to a class</span>. Choose the class(es) you&apos;re teaching, select a lesson, and review slides and notes before starting.
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground group-hover/prepare-card:text-secondary/70 italic mt-6 transition-colors">
                    Use this option if you&apos;re planning to teach now or schedule a lesson for later.
                  </CardFooter>
                </Card>

                <div className="mx-36 max-w-3xl">
                <Separator className="my-2" />
                </div>

                <Card
                  className={`transition-all text-left gap-0 group/browse-card shadow-none ${
                    loading ? "cursor-wait opacity-70" : "hover:shadow-md hover:bg-muted cursor-pointer hover:scale-[101%] text-muted-foreground hover:text-primary"
                  }`}
                  onClick={() => handleOptionSelect("view")}
                >
                  <CardHeader className="text-left">
                      <div className="flex items-center gap-2">
                      <BookOpen className="h-6 w-6  group-hover/browse-card:animate-bounce transition-colors" />
                        <CardTitle className="text-2xl">Browse Lesson Library</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="text-sm font-light">
                        Explore lesson materials <span className="font-medium">without teaching</span>. View all available lessons, slides, and notes at your own pace.
                      </CardContent>
                  {/* <CardFooter className="text-xs text-muted-foreground italic mt-6">
                  
                        Use this if you're reviewing content, planning ahead, or familiarising yourself with the Bullyproof material.
                       
                  </CardFooter> */}
                </Card>
              </div>
            </div>
            )}

            <div className={state.step === 1 ? "block" : "hidden"}>
              <LessonWizardClasses
                schoolId={schoolUuid}
                selectedClasses={state.selectedClasses}
                onClassesChange={(classes) =>
                  setState((prev) => ({ ...prev, selectedClasses: classes }))
                }
              />
            </div>

            {state.step === 2 && (
              <LessonWizardRecommendation
                recommendationData={isFetchingRecommendation ? null : recommendationData}
                isLoading={isRecommendationLoading}
                selectedClasses={state.selectedClasses}
                schoolSlug={schoolId}
                onProceedWithRecommendation={handleProceedWithRecommendation}
                onChooseDifferentLesson={() => {
                  setShouldPreSelectTopic(false);
                  goToStep(3);
                }}
                onGoToLiveLesson={(lessonId) => {
                  router.push(`/schools/${schoolId}/lessons/${lessonId}`);
                  handleOpenChange(false);
                }}
                onBack={() => goToStep(1)}
                onSelectSingleClass={(classId) => {
                  setState((prev) => ({
                    ...prev,
                    selectedClasses: prev.selectedClasses.filter((c) => c.id === classId),
                  }));
                  setSelectedStageId(null);
                  setShouldFetchRecommendations(true);
                  queryClient.invalidateQueries({ queryKey: ["lesson-recommendations"] });
                }}
                onSelectStage={handleSelectStage}
                onAddClassesToLesson={async (lessonId: string, classIds: string[]) => {
                  try {
                    // Fetch existing lesson to get current classIds
                    const lessonResult = await lessonsApi.get.byId(lessonId);
                    if (lessonResult.error || !lessonResult.data) {
                      throw new Error(lessonResult.error?.message || "Failed to fetch lesson");
                    }
                    
                    const existingClassIds = (lessonResult.data as any).assignedClasses?.map((c: any) => c.classId) || [];
                    const updatedClassIds = [...new Set([...existingClassIds, ...classIds])];
                    
                    // Update lesson with new classIds
                    const updateResult = await lessonsApi.put.update(lessonId, {
                      classIds: updatedClassIds,
                    });
                    
                    if (updateResult.error) {
                      throw new Error(updateResult.error.message || "Failed to add classes to lesson");
                    }
                    
                    // Navigate to lesson page
                    router.push(`/schools/${schoolId}/lessons/${lessonId}`);
                    handleOpenChange(false);
                  } catch (error: any) {
                    console.error("Failed to add classes to lesson:", error);
                    setError(error.message || "Failed to add classes to lesson. Please try again.");
                    throw error;
                  }
                }}
                onCancelLessons={async (lessonIds: string[]) => {
                  try {
                    for (const lessonId of lessonIds) {
                      const result = await lessonsApi.put.update(lessonId, { status: "cancelled" });
                      if (result.error) {
                        throw new Error(result.error.message || "Failed to cancel lesson");
                      }
                    }
                    // Refresh recommendations by refetching
                    setShouldFetchRecommendations(true);
                  } catch (error: any) {
                    console.error("Failed to cancel lessons:", error);
                    setError(error.message || "Failed to cancel lessons. Please try again.");
                    throw error;
                  }
                }}
                onCombineLessons={async (lessonIds: string[], allClassIds: string[]) => {
                  try {
                    if (isAdminRestricted && !onBehalfOfUserId) {
                      throw new Error(
                        "You must select a user to create the lesson on behalf of. Click Continue to reach the Confirm step, select a user, then return here to combine lessons."
                      );
                    }

                    // Cancel all existing lessons (set status to cancelled for data persistence)
                    for (const lessonId of lessonIds) {
                      const result = await lessonsApi.put.update(lessonId, { status: "cancelled" });
                      if (result.error) {
                        throw new Error(result.error.message || "Failed to cancel lesson");
                      }
                    }
                    
                    // Create new preparing lesson with all classes
                    if (!state.selectedTopic || !schoolUuid) {
                      throw new Error("Missing lesson or school information");
                    }
                    
                    const payload = buildCreateLessonPayload({
                      schoolId: schoolUuid,
                      topicId: state.selectedTopic.id,
                      classIds: allClassIds,
                      status: "preparing",
                      onBehalfOfUserId,
                    });
                    
                    const createResult = await lessonsApi.post.create(payload);
                    if (createResult.error || !createResult.data) {
                      throw new Error(createResult.error?.message || "Failed to create combined lesson");
                    }
                    
                    // Extract the lesson UUID from the response
                    const lessonId = createResult.data.id;
                    if (!lessonId) {
                      console.error("Lesson creation response:", createResult.data);
                      throw new Error("Lesson ID (UUID) not returned from API. Please try again.");
                    }
                    
                    // Invalidate lessons queries so the list shows fresh data
                    queryClient.invalidateQueries({ queryKey: lessonsKeys.all() });
                    // Invalidate recommendations so next wizard gets fresh data
                    queryClient.invalidateQueries({ queryKey: ["lesson-recommendations"] });
                    
                    // Set flag to prevent URL sync from interfering with redirect
                    isRedirectingAfterCreationRef.current = true;
                    
                    // Clear wizard params before redirecting
                    clearWizardParams();
                    
                    // Close drawer first
                    handleOpenChange(false);
                    
                    // Navigate to new lesson page using the UUID
                    router.push(`/schools/${schoolId}/lessons/${lessonId}`);
                    
                    // Reset flag after a delay to allow redirect to complete
                    setTimeout(() => {
                      isRedirectingAfterCreationRef.current = false;
                    }, 500);
                  } catch (error: any) {
                    console.error("Failed to combine lessons:", error);
                    setError(error.message || "Failed to combine lessons. Please try again.");
                    throw error;
                  }
                }}
              />
            )}

            <div
              className={state.step === 3 ? "flex flex-col h-full" : "hidden"}
            >
              <LessonWizardTopic
                selectedTopic={state.selectedTopic}
                selectedClasses={state.selectedClasses}
                onTopicChange={(topic) =>
                  setState((prev) => ({ ...prev, selectedTopic: topic }))
                }
                preSelectTopicId={shouldPreSelectTopic && recommendationData?.recommendedTopicId ? recommendationData.recommendedTopicId : null}
                recommendedStageId={recommendationData?.recommendedTopic?.stageId || null}
              />
            </div>

            <div className={state.step === 4 ? "block" : "hidden"}>
              <LessonWizardConfirm
                selectedClasses={state.selectedClasses}
                selectedTopic={state.selectedTopic}
                schoolId={schoolUuid}
                schoolSlug={schoolId}
                onBehalfOfUserId={onBehalfOfUserId}
                onOnBehalfOfUserIdChange={setOnBehalfOfUserId}
                isAdminRestricted={isAdminRestricted}
                onPrepareLesson={handlePrepareLesson}
                onStartLesson={handleStartLesson}
                isLoading={loading}
              />
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
                </div>
              </div>

              <div className="border-t p-4">
                <div className="flex items-center justify-between max-w-3xl mx-auto w-full relative">
            <Button
              variant="ghost"
              onClick={
                state.step === 0
                  ? showFeedbackGate
                    ? () => setShowFeedbackGate(false)
                    : () => handleOpenChange(false)
                  : goBack
              }
              disabled={loading}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              {state.step === 0
                ? showFeedbackGate
                  ? "Back"
                  : "Cancel"
                : "Back"}
            </Button>

            {/* Selected classes count with hover card - only show on step 1, centered */}
            {state.step === 1 && state.selectedClasses.length > 0 && (
              <div className="absolute left-1/2 -translate-x-1/2">
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button className="cursor-pointer">
                      <Badge 
                        variant="outline" 
                        className="border-blue-600 dark:border-blue-400 bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 dark:hover:bg-blue-400/20 transition-colors flex items-center gap-1.5"
                      >
                        <Check className="h-3 w-3" />
                        {state.selectedClasses.length} selected {state.selectedClasses.length === 1 ? "class" : "classes"}
                      </Badge>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent side="top" className="w-64 mb-2">
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-semibold mb-1 text-muted-foreground">Selected Classes</div>
                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                        {state.selectedClasses.map((cls) => (
                          <div key={cls.id} className="text-sm py-1">
                            {cls.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            )}

            {state.step === 0 && !showFeedbackGate ? (
              // Step 0 doesn't show continue button - user clicks cards instead
              <div className="w-[100px]" />
            ) : state.step === 0 && showFeedbackGate ? (
              // Feedback gate - no action button on right
              <div className="w-[100px]" />
            ) : state.step === 2 ? (
              // Recommendation step - show Proceed and Choose Another Lesson buttons side by side if we can proceed
              // Hide buttons if multiple stages detected but no stage selected yet
              (() => {
                const hasMultipleStages = recommendationData?.warning?.multipleStages && recommendationData.warning.multipleStages.length > 1;
                const shouldShowButtons = canProceed() && (!hasMultipleStages || selectedStageId !== null);
                
                return shouldShowButtons ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShouldPreSelectTopic(false);
                        goToStep(3);
                      }}
                      disabled={loading}
                    >
                      Choose another lesson
                    </Button>
                    <Button
                      onClick={handleProceedWithRecommendation}
                      disabled={loading}
                      className={`bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 gap-1 ${!loading ? 'animate-pulse' : ''}`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          {(() => {
                            // Check if there's a recommended topic for the selected stage
                            if (hasMultipleStages && selectedStageId) {
                              const selectedStageOption = recommendationData?.warning?.multipleStages?.find(
                                (stage) => stage.stageId === selectedStageId
                              );
                              // If there's a recommended lesson, say "Next", otherwise "Continue to Lesson Selection"
                              return selectedStageOption?.firstTopic?.id ? "Next" : "Continue to Lesson Selection";
                            }
                            return "Next";
                          })()}
                          <ChevronsRight className={`h-4 w-4 ${!loading ? 'animate-[var(--animate-bounce-right)]' : ''}`} />
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="w-[100px]" />
                );
              })()
            ) : state.step < totalSteps - 1 ? (
              <Button
                onClick={goNext}
                disabled={!canProceed() || loading}
                className={`bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 gap-1 ${canProceed() && !loading ? 'animate-pulse' : ''}`}
              >
                {state.step === 1 ? "Next" : "Continue"}
                <ChevronsRight className={`h-4 w-4 ${canProceed() && !loading ? 'animate-[var(--animate-bounce-right)]' : ''}`} />
              </Button>
            ) : state.step === 4 ? (
              /* Step 4 (Confirm): actions are in LessonWizardConfirm, no footer button */
              <div className="w-[100px]" />
            ) : (
              <div className="w-[100px]" />
            )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </DrawerContent>
    </Drawer>
  );
}
