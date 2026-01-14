"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@workspace/ui/components/drawer";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { LessonWizardClasses } from "./lesson-wizard-classes";
import { LessonWizardTopic } from "./lesson-wizard-topic";
import { LessonWizardConfirm } from "./lesson-wizard-confirm";
import type { ClassOption, TopicOption } from "@/types/lesson-wizard";
import { ChevronLeft, ChevronRight, Loader2, BookOpen, Play } from "lucide-react";
import { useLiveLessonStore } from "@/stores/live-lesson-store";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";

interface LessonWizardProps {
  schoolId: string; // This is actually the school slug from the URL
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LessonWizard({ schoolId, open, onOpenChange }: LessonWizardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolUuid, setSchoolUuid] = useState<string | null>(null);
  
  // Fetch school UUID from slug
  useEffect(() => {
    if (!schoolId) return;
    
    schoolApi.get.schoolBySlug(schoolId)
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

  const [state, setState] = useState({
    step: 0,
    selectedClasses: [] as ClassOption[],
    selectedTopic: null as TopicOption | null,
  });

  // Reset state when drawer closes to ensure clean state on next open
  useEffect(() => {
    if (!open) {
      setState({
        step: 0,
        selectedClasses: [],
        selectedTopic: null,
      });
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const totalSteps = 4;

  const goToStep = (step: number) => {
    setState((prev) => ({ ...prev, step: Math.max(0, Math.min(totalSteps - 1, step)) }));
    setError(null);
  };

  const goNext = () => {
    if (canProceed()) {
      goToStep(state.step + 1);
    }
  };

  const goBack = () => {
    goToStep(state.step - 1);
  };

  const canProceed = () => {
    switch (state.step) {
      case 0:
        return true; // Initial step - user selects an option
      case 1:
        return state.selectedClasses.length > 0;
      case 2:
        return state.selectedTopic !== null;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleOptionSelect = (option: 'teach' | 'view') => {
    if (option === 'view') {
      // Redirect to content page
      router.push(`/schools/${schoolId}/resources/content`);
      onOpenChange(false);
    } else {
      // Continue to next step (select classes)
      goToStep(1);
    }
  };

  const handleCreateLesson = async () => {
    if (!canProceed() || !state.selectedTopic || !schoolUuid) {
      if (!schoolUuid) {
        setError('School information not loaded. Please try again.');
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare payload - all lessons start immediately
      const payload = {
        schoolId: schoolUuid, // Use UUID for API call
        topicId: state.selectedTopic.id,
        classIds: state.selectedClasses.map((c) => c.id),
        status: 'in_progress', // Always start immediately
      };

      // Call the API to create the lesson
      const result = await lessonsApi.post.create(payload);

      if (result.error) {
        throw new Error(result.error.message || 'Failed to create lesson');
      }

      if (!result.data) {
        throw new Error('No data returned from API');
      }

      const lessonId = result.data.id;

      // Mark lesson as live in global store (with some helpful metadata)
      // Use the slug (schoolId from URL) for navigation, not the UUID
      useLiveLessonStore.getState().startLiveLesson({
        schoolSlug: schoolId, // Use slug from URL for navigation
        lessonId,
        title: result.data.topic?.title || "Live Lesson",
        classCount: state.selectedClasses.length,
        startedAt: new Date().toISOString(),
      });

      // Navigate to lesson page using slug
      router.push(`/schools/${schoolId}/lessons/${lessonId}`);

      // Close drawer
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to create lesson:', err);
      setError(err.message || 'Failed to create lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (state.step) {
      case 0:
        return 'What would you like to do?';
      case 1:
        return 'Select Classes';
      case 2:
        return 'Choose Topic';
      case 3:
        return 'Confirm';
      default:
        return 'Create Lesson';
    }
  };

  const getStepDescription = () => {
    switch (state.step) {
      case 0:
        return 'Choose how you want to proceed';
      case 1:
        return 'Choose which classes will participate in this lesson';
      case 2:
        return 'Select the lesson content you want to teach';
      case 3:
        return 'Review your selections before creating';
      default:
        return '';
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="top">
      <DrawerContent className="h-[90vh] max-w-3xl mx-auto">
        <DrawerHeader className="bg-muted">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 text-left">
              <DrawerTitle>{getStepTitle()}</DrawerTitle>
              <DrawerDescription>{getStepDescription()}</DrawerDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Step {state.step + 1} of {totalSteps}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalSteps }, (_, i) => i).map((step) => (
                  <span
                    key={step}
                    className={`
                      inline-block h-1.5 w-4 rounded-full transition-colors
                      ${step === state.step
                        ? 'bg-primary'
                        : step < state.step
                        ? 'bg-primary/40'
                        : 'bg-border'
                      }
                    `}
                  />
                ))}
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            {/* Always render all step components to maintain consistent hook order */}
            {/* Hide inactive steps using CSS to prevent hook order issues */}
            
            {/* Step 0: Initial option selection */}
            <div className={state.step === 0 ? 'block' : 'hidden'}>
              <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                <Card
                  className="hover:shadow-md transition-shadow cursor-pointer h-full"
                  onClick={() => handleOptionSelect('teach')}
                >
                  <CardHeader className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="rounded-full bg-primary/10 p-4">
                        <Play className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-xl text-center">
                        I'm going to teach a class right now
                      </CardTitle>
                    </div>
                  </CardHeader>
                </Card>

                <Card
                  className="hover:shadow-md transition-shadow cursor-pointer h-full"
                  onClick={() => handleOptionSelect('view')}
                >
                  <CardHeader className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="rounded-full bg-secondary/10 p-4">
                        <BookOpen className="h-8 w-8 text-secondary-foreground" />
                      </div>
                      <CardTitle className="text-xl text-center">
                        I just want to look at the content
                      </CardTitle>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>

            <div className={state.step === 1 ? 'block' : 'hidden'}>
              <LessonWizardClasses
                schoolId={schoolUuid}
                selectedClasses={state.selectedClasses}
                onClassesChange={(classes) =>
                  setState((prev) => ({ ...prev, selectedClasses: classes }))
                }
              />
            </div>

            <div className={state.step === 2 ? 'flex flex-col h-full' : 'hidden'}>
              <LessonWizardTopic
                selectedTopic={state.selectedTopic}
                selectedClasses={state.selectedClasses}
                onTopicChange={(topic) =>
                  setState((prev) => ({ ...prev, selectedTopic: topic }))
                }
              />
            </div>

            <div className={state.step === 3 ? 'block' : 'hidden'}>
              <LessonWizardConfirm
                selectedClasses={state.selectedClasses}
                selectedTopic={state.selectedTopic}
              />
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex items-center justify-between max-w-3xl mx-auto w-full">
            <Button
              variant="outline"
              onClick={state.step === 0 ? () => onOpenChange(false) : goBack}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              {state.step === 0 ? 'Cancel' : 'Back'}
            </Button>

            {state.step === 0 ? (
              // Step 0 doesn't show continue button - user clicks cards instead
              <div className="w-[100px]" />
            ) : state.step < totalSteps - 1 ? (
              <Button 
                onClick={goNext} 
                disabled={!canProceed() || loading}
                className="bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateLesson}
                disabled={loading || !canProceed()}
                className="bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Lesson
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

