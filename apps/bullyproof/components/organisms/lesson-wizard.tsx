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
import { LessonWizardClasses } from "./lesson-wizard-classes";
import { LessonWizardTopic } from "./lesson-wizard-topic";
import { LessonWizardSchedule } from "./lesson-wizard-schedule";
import { LessonWizardConfirm } from "./lesson-wizard-confirm";
import type { ClassOption, TopicOption, ScheduleOption, LessonCreatePayload } from "@/types/lesson-wizard";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
    step: 1,
    selectedClasses: [] as ClassOption[],
    selectedTopic: null as TopicOption | null,
    scheduleOption: 'immediate' as ScheduleOption,
    scheduledDate: '',
    scheduledTime: '',
  });

  const totalSteps = 4;

  const goToStep = (step: number) => {
    setState((prev) => ({ ...prev, step: Math.max(1, Math.min(totalSteps, step)) }));
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
      case 1:
        return state.selectedClasses.length > 0;
      case 2:
        return state.selectedTopic !== null;
      case 3:
        if (state.scheduleOption === 'scheduled') {
          return state.scheduledDate !== '' && state.scheduledTime !== '';
        }
        return true;
      case 4:
        return true;
      default:
        return false;
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
      // Prepare payload
      const scheduledFor = state.scheduleOption === 'scheduled' && state.scheduledDate && state.scheduledTime
        ? `${state.scheduledDate}T${state.scheduledTime}:00`
        : undefined;

      const payload = {
        schoolId: schoolUuid, // Use UUID for API call
        topicId: state.selectedTopic.id,
        classIds: state.selectedClasses.map((c) => c.id),
        status: state.scheduleOption === 'immediate' ? 'in_progress' : (scheduledFor ? 'scheduled' : 'draft'),
        scheduledFor,
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
      case 1:
        return 'Select Classes';
      case 2:
        return 'Choose Topic';
      case 3:
        return 'Schedule';
      case 4:
        return 'Confirm';
      default:
        return 'Create Lesson';
    }
  };

  const getStepDescription = () => {
    switch (state.step) {
      case 1:
        return 'Choose which classes will participate in this lesson';
      case 2:
        return 'Select the lesson content you want to teach';
      case 3:
        return 'Decide when to start this lesson';
      case 4:
        return 'Review your selections before creating';
      default:
        return '';
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="top">
      <DrawerContent className="h-[90vh] max-w-4xl mx-auto">
        <DrawerHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DrawerTitle>{getStepTitle()}</DrawerTitle>
              <DrawerDescription>{getStepDescription()}</DrawerDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground">Step {state.step} of {totalSteps}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
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
          <div className="max-w-4xl mx-auto">
            {state.step === 1 && (
              schoolUuid ? (
                <LessonWizardClasses
                  schoolId={schoolUuid}
                  selectedClasses={state.selectedClasses}
                  onClassesChange={(classes) =>
                    setState((prev) => ({ ...prev, selectedClasses: classes }))
                  }
                />
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )
            )}

            {state.step === 2 && (
              <LessonWizardTopic
                selectedTopic={state.selectedTopic}
                onTopicChange={(topic) =>
                  setState((prev) => ({ ...prev, selectedTopic: topic }))
                }
              />
            )}

            {state.step === 3 && (
              <LessonWizardSchedule
                scheduleOption={state.scheduleOption}
                scheduledDate={state.scheduledDate}
                scheduledTime={state.scheduledTime}
                onScheduleChange={(option) =>
                  setState((prev) => ({ ...prev, scheduleOption: option }))
                }
                onDateChange={(date) =>
                  setState((prev) => ({ ...prev, scheduledDate: date }))
                }
                onTimeChange={(time) =>
                  setState((prev) => ({ ...prev, scheduledTime: time }))
                }
              />
            )}

            {state.step === 4 && (
              <LessonWizardConfirm
                selectedClasses={state.selectedClasses}
                selectedTopic={state.selectedTopic}
                scheduleOption={state.scheduleOption}
                scheduledDate={state.scheduledDate}
                scheduledTime={state.scheduledTime}
              />
            )}

            {error && (
              <div className="mt-4 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
            <Button
              variant="outline"
              onClick={state.step === 1 ? () => onOpenChange(false) : goBack}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              {state.step === 1 ? 'Cancel' : 'Back'}
            </Button>

            <div className="text-sm text-muted-foreground">
              Step {state.step} of {totalSteps}
            </div>

            {state.step < totalSteps ? (
              <Button onClick={goNext} disabled={!canProceed() || loading}>
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateLesson}
                disabled={loading || !canProceed()}
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

