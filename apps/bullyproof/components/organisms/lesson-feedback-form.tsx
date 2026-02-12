"use client";

import { useState, useEffect } from "react";
import { Star, Loader2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { lessonsKeys } from "@/entities/lessons/model/keys";
import { LessonTopicThumbnail } from "@/entities/lessons/ui/lesson-card";
import { useMeStore } from "@/entities/me/model/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

// Type for lesson info in multi-lesson mode
export interface LessonForFeedback {
  id: string;
  topicId: string;
  topicTitle?: string;
  stageOrder?: number | null;
  stageName?: string;
  assignedClasses?: Array<{
    classId: string;
    className: string;
  }>;
  createdByUserId?: string | null;
  metadata?: Record<string, unknown>;
}

interface LessonFeedbackFormProps {
  // Single lesson mode (for feedback page)
  lessonId?: string;
  
  // Multi-lesson mode (for dashboard)
  lessons?: LessonForFeedback[];
  
  // External dialog control
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // Callback when all lessons are complete
  onComplete?: () => void;
  
  // Hide the "edit feedback" button when closed (for dashboard use)
  hideClosedState?: boolean;
}

export function LessonFeedbackForm({
  lessonId,
  lessons,
  open,
  onOpenChange,
  onComplete,
  hideClosedState = false,
}: LessonFeedbackFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useMeStore((s) => s.currentUser);
  
  // Multi-lesson state
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  
  // Determine if we're in multi-lesson mode
  const isMultiLessonMode = !!(lessons && lessons.length > 0);
  const totalLessons = isMultiLessonMode ? lessons.length : 1;
  const currentLessonFromProps = isMultiLessonMode ? lessons[currentLessonIndex] : null;
  const effectiveLessonId = isMultiLessonMode ? currentLessonFromProps?.id : lessonId;
  
  // Dialog state - use external control if provided, otherwise internal
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  
  // Form state
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch lesson details for single-lesson mode (to show preview)
  const { data: singleLessonDetails, isLoading: isLoadingLessonDetails } = useQuery({
    queryKey: ["lesson-details-for-feedback", lessonId],
    queryFn: async () => {
      if (!lessonId) return null;
      const result = await lessonsApi.get.byId(lessonId);
      if (result.error || !result.data) return null;
      
      const detail = result.data as {
        createdByUserId?: string | null;
        metadata?: Record<string, unknown>;
        topicId?: string;
        topic?: { title?: string; stageOrder?: number | null; stageName?: string };
        assignedClasses?: Array<{ classId: string; className: string }>;
      };
      return {
        id: lessonId,
        topicId: detail.topicId,
        topicTitle: detail.topic?.title || "Untitled Lesson",
        stageOrder: detail.topic?.stageOrder ?? null,
        stageName: detail.topic?.stageName,
        assignedClasses: detail.assignedClasses?.map((c) => ({
          classId: c.classId,
          className: c.className,
        })) || [],
        createdByUserId: detail.createdByUserId,
        metadata: detail.metadata,
      };
    },
    enabled: !!lessonId && !isMultiLessonMode,
    staleTime: 5 * 60 * 1000,
  });

  // Use lesson from props (multi-lesson mode) or fetched details (single-lesson mode)
  const currentLesson = isMultiLessonMode ? currentLessonFromProps : singleLessonDetails;

  // Ownership check: only feedback owner (metadata.feedbackOwnerUserId or createdByUserId) can submit feedback
  const lessonForOwnerCheck = isMultiLessonMode ? currentLessonFromProps : singleLessonDetails;
  const feedbackOwnerId =
    (lessonForOwnerCheck as LessonForFeedback)?.metadata?.feedbackOwnerUserId ??
    (lessonForOwnerCheck as LessonForFeedback)?.createdByUserId;
  const isFeedbackOwner =
    !!currentUser?.id &&
    !!feedbackOwnerId &&
    feedbackOwnerId === currentUser.id;

  // Fetch existing feedback for current lesson
  const { data: existingFeedback, isLoading: isLoadingFeedback } = useQuery({
    queryKey: ["lesson-feedback", effectiveLessonId],
    queryFn: async () => {
      if (!effectiveLessonId) return null;
      const result = await lessonsApi.feedback.get.byLessonId(effectiveLessonId);
      if (result.error) {
        // 404 means no feedback exists yet, which is fine
        if (
          result.error.message?.includes("not found") ||
          result.error.status === 404
        ) {
          return null;
        }
        throw new Error(result.error.message || "Failed to load feedback");
      }
      return result.data;
    },
    retry: false,
    enabled: !!effectiveLessonId,
  });

  // Combined loading state
  const isLoading = isLoadingFeedback || (!isMultiLessonMode && isLoadingLessonDetails);

  // Reset form when lesson changes (multi-lesson mode)
  useEffect(() => {
    setRating(null);
    setComments("");
    setError(null);
  }, [currentLessonIndex]);

  // Initialize form with existing feedback
  useEffect(() => {
    if (existingFeedback) {
      setRating(existingFeedback.rating);
      setComments(existingFeedback.comments || "");
    }
  }, [existingFeedback]);

  const handleRatingClick = (value: number) => {
    setRating(value);
    setError(null);
  };

  const handleMouseEnter = (value: number) => {
    setHoveredRating(value);
  };

  const handleMouseLeave = () => {
    setHoveredRating(null);
  };

  const handleSubmit = async () => {
    if (!rating || !effectiveLessonId) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let result;
      if (existingFeedback) {
        // Update existing feedback
        result = await lessonsApi.feedback.put.update(effectiveLessonId, {
          rating,
          comments: comments || undefined,
        });
      } else {
        // Create new feedback
        result = await lessonsApi.feedback.post.create(effectiveLessonId, {
          rating,
          comments: comments || undefined,
        });
      }

      if (result.error) {
        throw new Error(result.error.message || "Failed to save feedback");
      }

      // Invalidate all lessons queries (list + details) to ensure fresh data everywhere
      await queryClient.invalidateQueries({ queryKey: lessonsKeys.all() });
      await queryClient.invalidateQueries({
        queryKey: ["lesson-feedback", effectiveLessonId],
      });
      // Invalidate recommendations so next lesson wizard gets fresh data
      await queryClient.invalidateQueries({ queryKey: ["lesson-recommendations"] });

      // Multi-lesson mode: advance to next lesson or complete
      if (isMultiLessonMode) {
        if (currentLessonIndex < totalLessons - 1) {
          // More lessons to go
          setCurrentLessonIndex(currentLessonIndex + 1);
        } else {
          // All done
          setIsOpen(false);
          onComplete?.();
        }
      } else {
        // Single lesson mode: close dialog and refresh
        setIsOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while saving feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (isMultiLessonMode && currentLessonIndex < totalLessons - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else {
      setIsOpen(false);
      if (isMultiLessonMode) {
        onComplete?.();
      }
    }
  };

  const filledRating = hoveredRating ?? rating;

  // Don't render anything if no lesson ID
  if (!effectiveLessonId) {
    return null;
  }

  // Non-owner view: show message instead of dialog (single-lesson mode or multi-lesson with owner check)
  if (!isFeedbackOwner && !isMultiLessonMode && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-lg border bg-muted/30 p-6 max-w-md text-center space-y-4">
          <p className="text-muted-foreground font-medium">
            Only the teacher who completed the lesson can give feedback.
          </p>
          <p className="text-sm text-muted-foreground">
            This lesson was completed by another teacher. You cannot submit or edit feedback for it.
          </p>
        </div>
      </div>
    );
  }

  // Multi-lesson mode: if current lesson is not owned by user, show message (when we have owner info)
  if (
    !isFeedbackOwner &&
    isMultiLessonMode &&
    lessonForOwnerCheck &&
    (lessonForOwnerCheck as LessonForFeedback).createdByUserId !== undefined &&
    !isLoading
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="rounded-lg border bg-muted/30 p-6 max-w-md text-center space-y-4">
          <p className="text-muted-foreground font-medium">
            Only the teacher who completed the lesson can give feedback.
          </p>
          <p className="text-sm text-muted-foreground">
            This lesson was completed by another teacher. You cannot submit or edit feedback for it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Edit Feedback Button - shown when dialog is closed (single lesson mode only) */}
      {!isOpen && !hideClosedState && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">
            {existingFeedback 
              ? "Your feedback has been saved." 
              : "Provide feedback to complete this lesson."}
          </p>
          <Button
            variant="outline"
            onClick={() => setIsOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {existingFeedback ? "Edit Feedback" : "Add Feedback"}
          </Button>
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Rate Your Lesson Experience</span>
              {isMultiLessonMode && totalLessons > 1 && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  {currentLessonIndex + 1} of {totalLessons}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Please provide your feedback. Rating is required to complete the
              lesson.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Lesson Preview - shown when lesson info is available */}
              {currentLesson && (
                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                  {/* Thumbnail */}
                  <div className="w-full aspect-video">
                    <LessonTopicThumbnail topicId={currentLesson.topicId} horizontal={false} />
                  </div>
                  
                  {/* Lesson Info */}
                  <div className="p-3 space-y-2">
                    {/* Stage name */}
                    {currentLesson.stageName && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {currentLesson.stageName}
                      </p>
                    )}
                    
                    {/* Topic title with L badge */}
                    <div className="flex items-center gap-2">
                      {currentLesson.stageOrder !== null && currentLesson.stageOrder !== undefined && (
                        <Badge
                          variant="secondary"
                          className="text-xs text-muted-foreground font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
                        >
                          L{currentLesson.stageOrder}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold text-primary capitalize line-clamp-2">
                        {currentLesson.topicTitle || "Untitled Lesson"}
                      </span>
                    </div>
                    
                    {/* Assigned classes */}
                    {currentLesson.assignedClasses && currentLesson.assignedClasses.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {currentLesson.assignedClasses.map((classItem) => (
                          <Badge
                            key={classItem.classId}
                            variant="outline"
                            className="text-xs py-0 px-1.5 h-5"
                          >
                            {classItem.className}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SVG Gradient Definition */}
              <svg width="0" height="0" className="absolute">
                <defs>
                  <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Star Rating */}
              <div className="space-y-2">
                <Label htmlFor="rating" className="text-sm">Rating *</Label>
                <div
                  className="flex gap-1.5"
                  role="radiogroup"
                  aria-label="Lesson rating"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingClick(value)}
                      onMouseEnter={() => handleMouseEnter(value)}
                      onMouseLeave={handleMouseLeave}
                      className="group relative inline-block"
                      aria-label={`Rate ${value} out of 5 stars`}
                      aria-pressed={rating === value}
                      disabled={isSubmitting}
                    >
                      <Star
                        className={`h-7 w-7 transition-all ${
                          value <= (filledRating ?? 0)
                            ? "text-yellow-500"
                            : "fill-none text-muted-foreground"
                        } group-hover:text-yellow-500`}
                        style={
                          value <= (filledRating ?? 0)
                            ? {
                                fill: "url(#gold-gradient)",
                                stroke: "url(#gold-gradient)",
                              }
                            : undefined
                        }
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {!rating && "Click a star to rate this lesson"}
                  {rating && `You rated this lesson ${rating} out of 5 stars`}
                </p>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <Label htmlFor="comments" className="text-sm">Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Share your thoughts about this lesson..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  className="text-sm"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-between gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  size="sm"
                >
                  {isMultiLessonMode && currentLessonIndex < totalLessons - 1 
                    ? "Skip" 
                    : "Later"}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!rating || isSubmitting}
                  className="min-w-[140px] text-sm"
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : existingFeedback ? (
                    "Update Feedback"
                  ) : isMultiLessonMode && currentLessonIndex < totalLessons - 1 ? (
                    "Submit & Next"
                  ) : (
                    "Mark as Completed"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
