"use client";

import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface LessonFeedbackFormProps {
  lessonId: string;
}

export function LessonFeedbackForm({ lessonId }: LessonFeedbackFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing feedback
  const { data: existingFeedback, isLoading } = useQuery({
    queryKey: ["lesson-feedback", lessonId],
    queryFn: async () => {
      const result = await lessonsApi.feedback.get.byLessonId(lessonId);
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
  });

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
    if (!rating) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let result;
      if (existingFeedback) {
        // Update existing feedback
        result = await lessonsApi.feedback.put.update(lessonId, {
          rating,
          comments: comments || undefined,
        });
      } else {
        // Create new feedback
        result = await lessonsApi.feedback.post.create(lessonId, {
          rating,
          comments: comments || undefined,
        });
      }

      if (result.error) {
        throw new Error(result.error.message || "Failed to save feedback");
      }

      // Invalidate queries to refresh lesson status
      await queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      await queryClient.invalidateQueries({
        queryKey: ["lesson-feedback", lessonId],
      });

      // Refresh the page to show updated status
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filledRating = hoveredRating ?? rating;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Rate Your Lesson Experience</CardTitle>
        <CardDescription className="text-sm">
          Please provide your feedback. Rating is required to complete the
          lesson.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
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
                rows={4}
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!rating || isSubmitting}
                className="min-w-[160px] text-sm"
                size="sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : existingFeedback ? (
                  "Update Feedback"
                ) : (
                  "Mark as Completed"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
