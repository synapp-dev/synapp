"use client";

import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
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
        if (result.error.message?.includes("not found") || result.status === 404) {
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
      await queryClient.invalidateQueries({ queryKey: ["lesson-feedback", lessonId] });
      
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
    <Card>
      <CardHeader>
        <CardTitle>Rate Your Lesson Experience</CardTitle>
        <CardDescription>
          Please provide your feedback. Rating is required to complete the lesson.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Star Rating */}
            <div className="space-y-2">
              <Label htmlFor="rating">Rating *</Label>
              <div className="flex gap-2" role="radiogroup" aria-label="Lesson rating">
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
                      className={`h-8 w-8 transition-colors ${
                        value <= (filledRating ?? 0)
                          ? "fill-primary text-primary"
                          : "fill-none text-muted-foreground"
                      } group-hover:fill-primary group-hover:text-primary`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {!rating && "Click a star to rate this lesson"}
                {rating && `You rated this lesson ${rating} out of 5 stars`}
              </p>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Share your thoughts about this lesson..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={6}
                disabled={isSubmitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!rating || isSubmitting}
                className="min-w-[200px]"
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

