"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { CourseRatingInput } from "@/components/molecules/course-rating-input";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { QuestionRenderer } from "@/components/molecules/question-renderer";
import { QuestionDefinition, QuestionAnswer, QuestionMetadata } from "@/types/course-ratings";
import { certificationApi } from "@/entities/certification/api/endpoints";
import { apiFetch } from "@/lib/api/fetcher.client";

interface CourseRatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName?: string;
  onSubmit?: () => void;
  onSkip?: () => void;
}

export function CourseRatingModal({
  open,
  onOpenChange,
  courseId,
  courseName,
  onSubmit,
  onSkip,
}: CourseRatingModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionDefinitions, setQuestionDefinitions] = useState<QuestionDefinition[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string | number | string[] | null>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we're mounted (client-side) before fetching
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch course data to get rating questions when modal opens
  useEffect(() => {
    // Only fetch on client side after mount and when modal is open
    // Validate courseId is a valid UUID format
    if (!isMounted || !open || !courseId || typeof courseId !== 'string' || courseId.trim() === '') {
      return;
    }

    const fetchCourseQuestions = async () => {
      try {
        setIsLoadingQuestions(true);
        const result = await certificationApi.courses.byId(courseId);
        
        if (result.error) {
          // Log error but don't show it to user - questions are optional
          console.warn("Failed to fetch course questions:", result.error.message);
          setQuestionDefinitions([]);
          setQuestionAnswers({});
          return;
        }
        
        const courseData = result.data;
        
        if (!courseData) {
          setQuestionDefinitions([]);
          setQuestionAnswers({});
          return;
        }
        
      
        
        // Extract rating questions from course data
        // Handle both array and null/undefined cases
        const questions = (courseData as any)?.ratingQuestions as QuestionDefinition[] | null | undefined;
        if (questions && Array.isArray(questions) && questions.length > 0) {
          setQuestionDefinitions(questions);
          // Initialize answers with null/empty values
          const initialAnswers: Record<string, string | number | string[] | null> = {};
          questions.forEach((q: QuestionDefinition) => {
            if (q.type === "multiple_choice") {
              initialAnswers[q.id] = ""; // Single choice uses empty string
            } else {
              initialAnswers[q.id] = null;
            }
          });
          setQuestionAnswers(initialAnswers);
        } else {
          // No questions configured for this course - this is fine
          setQuestionDefinitions([]);
          setQuestionAnswers({});
        }
      } catch (err) {
        // Network error or other exception - log but don't break the UI
        console.warn("Error fetching course questions:", err);
        setQuestionDefinitions([]);
        setQuestionAnswers({});
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchCourseQuestions();
  }, [isMounted, open, courseId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setRating(0);
      setComment("");
      setQuestionAnswers({});
      setError(null);
    }
  }, [open]);

  const handleQuestionChange = (questionId: string, value: string | number | string[]) => {
    setQuestionAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const validateQuestions = (): boolean => {
    for (const question of questionDefinitions) {
      if (question.required) {
        const answer = questionAnswers[question.id];
        if (answer === null || answer === undefined || answer === "" || 
            (Array.isArray(answer) && answer.length === 0)) {
          setError(`Please answer the required question: ${question.label}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    // Validate required questions
    if (!validateQuestions()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build question metadata object
      const questionMetadata: QuestionMetadata | null = questionDefinitions.length > 0
        ? {
            questions: questionDefinitions.map((q) => ({
              id: q.id,
              type: q.type,
              label: q.label,
              required: q.required,
              options: q.options,
              min: q.min,
              max: q.max,
              value: questionAnswers[q.id] ?? (q.type === "multiple_choice" ? "" : null),
            } as QuestionAnswer)),
          }
        : null;

      const result = await apiFetch<{
        id: string;
        rating: number;
        comment: string | null;
        createdAt: string;
        updatedAt: string;
      }>(`/certification/courses/${courseId}/ratings`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
          questionMetadata,
        }),
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to submit rating");
      }

      // Reset form
      setRating(0);
      setComment("");
      setQuestionAnswers({});

      // Call onSubmit callback if provided (guard will handle closing/navigation)
      if (onSubmit) {
        onSubmit();
      } else {
        // If no callback provided, close modal
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error("Error submitting rating:", err);
      setError(err.message || "Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    // Reset form and close modal
    setRating(0);
    setComment("");
    setQuestionAnswers({});
    setError(null);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      // Reset form when closing
      setRating(0);
      setComment("");
      setQuestionAnswers({});
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Rate This Course
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            {courseName ? (
              <>
                How would you rate your experience with the <strong>{courseName}</strong>?
              </>
            ) : (
              "How would you rate your experience with this course?"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <CourseRatingInput
              value={rating}
              onChange={setRating}
              disabled={isSubmitting}
              size="h-8 w-8"
              className="justify-center"
            />
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Additional Questions - Only render after mount to prevent hydration issues */}
          {isMounted && (
            <>
              {isLoadingQuestions ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : questionDefinitions.length > 0 ? (
                <div className="flex flex-col pt-4">
                  <div className="flex flex-col gap-6">
                    {questionDefinitions.map((question) => (
                      <QuestionRenderer
                        key={question.id}
                        question={question}
                        value={questionAnswers[question.id] ?? null}
                        onChange={(value) => handleQuestionChange(question.id, value)}
                        disabled={isSubmitting}
                      />
                    ))}
                  </div>
            
                </div>
              ) : null}
            </>
          )}

          {/* Comment Textarea */}
          <div className="flex flex-col gap-2 mt-8">
            <label
              htmlFor="rating-comment"
              className="text-sm font-medium text-muted-foreground"
            >
              Feedback (optional)
            </label>
            <Textarea
              id="rating-comment"
              placeholder="Tell us what you think about this course..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className={cn(
              "w-full sm:w-auto",
              "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Rating"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
