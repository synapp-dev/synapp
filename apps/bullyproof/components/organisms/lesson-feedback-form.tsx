"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";

interface LessonFeedbackFormProps {
  lessonId: string;
}

export function LessonFeedbackForm({ lessonId }: LessonFeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRatingClick = (value: number) => {
    setRating(value);
  };

  const handleMouseEnter = (value: number) => {
    setHoveredRating(value);
  };

  const handleMouseLeave = () => {
    setHoveredRating(null);
  };

  const handleSubmit = () => {
    // TODO: Submit to backend when implemented
    console.log("Submitting feedback:", { lessonId, rating, comments });
    setIsSubmitted(true);
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
        {!isSubmitted ? (
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
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!rating}
                className="min-w-[200px]"
              >
                Mark as Completed
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-primary/10 rounded-lg">
              <div className="text-center space-y-2">
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={`h-6 w-6 ${
                        value <= (rating ?? 0)
                          ? "fill-primary text-primary"
                          : "fill-none text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <h3 className="text-lg font-semibold">Thank You!</h3>
                <p className="text-sm text-muted-foreground">
                  Your lesson has been marked as completed.
                </p>
              </div>
            </div>
            {comments && (
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm font-medium mb-1">Your Feedback</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {comments}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

