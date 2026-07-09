"use client";

import type { CertificationCourseRow } from "@/types/db";

import { useState, useEffect } from "react";
import { Star, Loader2, MessageSquare, Calendar, Edit } from "lucide-react";
import ReactTimeago from "react-timeago";
import { Separator } from "@workspace/ui/components/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { apiFetch } from "@/lib/api/fetcher.client";
import { certificationApi } from "@/entities/certification/api/endpoints";
import { CourseRatingQuestionsEditor } from "@/components/organisms/course-rating-questions-editor";
import { CourseRatingInput } from "@/components/molecules/course-rating-input";
import { QuestionRenderer } from "@/components/molecules/question-renderer";
import type { QuestionDefinition } from "@/types/course-ratings";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";

interface CourseRating {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  questionMetadata: Record<string, any> | null;
  userName?: string;
  firstName?: string;
  lastName?: string;
  schools?: string[];
}

type Course = CertificationCourseRow & {
  topicCount?: number;
};

interface CertificationCourseRatingsProps {
  courseId: string;
  course?: Course;
  onCourseUpdated?: () => void;
}

function StarDisplay({ rating, size = "h-5 w-5" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size,
            star <= rating
              ? "fill-current text-amber-500"
              : "fill-none text-muted-foreground"
          )}
        />
      ))}
      <span className="ml-2 text-sm font-medium">{rating}/5</span>
    </div>
  );
}

export function CertificationCourseRatings({
  courseId,
  course,
  onCourseUpdated,
}: CertificationCourseRatingsProps) {
  const [ratings, setRatings] = useState<CourseRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingQuestions, setRatingQuestions] = useState<QuestionDefinition[]>([]);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  
  // Example preview values
  const [exampleRating, setExampleRating] = useState<number>(5);
  const [exampleComment, setExampleComment] = useState<string>("This is an example of what a course review looks like. Users can provide a star rating (1-5) and an optional comment. Additional questions may also be displayed here if configured.");
  const [exampleQuestionAnswers, setExampleQuestionAnswers] = useState<Record<string, string | number | string[] | null>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Edit dialog state
  const [editingQuestions, setEditingQuestions] = useState<QuestionDefinition[]>([]);
  const [editingRating, setEditingRating] = useState<number>(5);
  const [editingComment, setEditingComment] = useState<string>("");
  const [editingQuestionAnswers, setEditingQuestionAnswers] = useState<Record<string, string | number | string[] | null>>({});

  // Load rating questions from course data
  useEffect(() => {
    if (course) {
      if (course.ratingQuestions && Array.isArray(course.ratingQuestions)) {
        setRatingQuestions(course.ratingQuestions as QuestionDefinition[]);
        // Initialize example question answers
        const initialAnswers: Record<string, string | number | string[] | null> = {};
        course.ratingQuestions.forEach((q: QuestionDefinition) => {
          if (q.type === "multiple_choice") {
            initialAnswers[q.id] = q.options?.[0] || "";
          } else if (q.type === "rating") {
            initialAnswers[q.id] = q.min || 3;
          } else {
            initialAnswers[q.id] = "Example answer";
          }
        });
        setExampleQuestionAnswers(initialAnswers);
      } else {
        setRatingQuestions([]);
        setExampleQuestionAnswers({});
      }
    }
  }, [course]);
  
  // Update example question answers when questions change
  useEffect(() => {
    const updatedAnswers: Record<string, string | number | string[] | null> = {};
    ratingQuestions.forEach((q) => {
      if (exampleQuestionAnswers[q.id] !== undefined) {
        updatedAnswers[q.id] = exampleQuestionAnswers[q.id];
      } else {
        if (q.type === "multiple_choice") {
          updatedAnswers[q.id] = q.options?.[0] || "";
        } else if (q.type === "rating") {
          updatedAnswers[q.id] = q.min || 3;
        } else {
          updatedAnswers[q.id] = "Example answer";
        }
      }
    });
    setExampleQuestionAnswers(updatedAnswers);
  }, [ratingQuestions]);

  useEffect(() => {
    const fetchRatings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiFetch<CourseRating[]>(
          `/certification/courses/${courseId}/ratings`
        );

        if (result.error) {
          setError(result.error.message || "Failed to fetch ratings");
          return;
        }

        if (result.data) {
          setRatings(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch course ratings:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch ratings");
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchRatings();
    }
  }, [courseId]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratings.filter((r) => r.rating === star).length,
    percentage:
      ratings.length > 0
        ? (ratings.filter((r) => r.rating === star).length / ratings.length) *
          100
        : 0,
  }));

  return (
    <div className="space-y-6">
      <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Example Preview and Summary */}
              <div className="flex gap-6 mb-6">
                {/* Example Preview Card - 3/5 width */}
                <div className="flex-[3]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">Review Dialog Preview</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingQuestions([...ratingQuestions]);
                        setEditingRating(exampleRating);
                        setEditingComment(exampleComment);
                        setEditingQuestionAnswers({...exampleQuestionAnswers});
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  <Card>
                    <CardHeader className="pb-4">
                      <div>
                        <h3 className="text-2xl font-semibold text-center mb-2">
                          Rate This Course
                        </h3>
                        <p className="text-center text-lg text-muted-foreground">
                          {course?.name ? (
                            <>
                              How would you rate your experience with the <strong>{course.name}</strong>?
                            </>
                          ) : (
                            "How would you rate your experience with this course?"
                          )}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col gap-4 py-4">
                        {/* Star Rating */}
                        <div className="flex flex-col items-center gap-2">
                          <CourseRatingInput
                            value={exampleRating}
                            onChange={() => {}} // Disabled in preview
                            disabled={true}
                            size="h-8 w-8"
                            className="justify-center"
                          />
                          {exampleRating > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {exampleRating === 1 && "Poor"}
                              {exampleRating === 2 && "Fair"}
                              {exampleRating === 3 && "Good"}
                              {exampleRating === 4 && "Very Good"}
                              {exampleRating === 5 && "Excellent"}
                            </p>
                          )}
                        </div>

                        {/* Additional Questions */}
                        {ratingQuestions.length > 0 && (
                          <div className="flex flex-col pt-4">
                            <div className="flex flex-col gap-6">
                              {ratingQuestions.map((question) => (
                                <QuestionRenderer
                                  key={question.id}
                                  question={question}
                                  value={exampleQuestionAnswers[question.id] ?? null}
                                  onChange={() => {}} // Disabled in preview
                                  disabled={true}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Comment */}
                        <div className="flex flex-col gap-2 mt-8">
                          <label
                            htmlFor="preview-rating-comment"
                            className="text-sm font-medium text-muted-foreground"
                          >
                            Feedback
                          </label>
                          <div className="rounded-md border bg-muted/50 p-3 min-h-[96px] flex items-start">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {exampleComment || "Tell us what you think about this course..."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Cards - 2/5 width */}
                <div className="flex-[2] space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Average Rating</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-bold">
                          {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
                        </div>
                        <StarDisplay rating={Math.round(averageRating)} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Based on {ratings.length} {ratings.length === 1 ? "rating" : "ratings"}
                      </p>
                    </CardContent>
                  </Card>

                  <div className="border-t" />

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Rating Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {ratingDistribution.map(({ star, count, percentage }) => (
                          <div key={star} className="flex items-center gap-3">
                            <div className="flex items-center gap-1 w-20">
                              <span className="text-sm font-medium">{star}</span>
                              <Star className="h-3 w-3 fill-current text-amber-500" />
                            </div>
                            <div className="flex-1">
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

      <Separator className="my-4" />

      {/* Individual Ratings */}
      {ratings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">
              No ratings yet for this course.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            All Ratings ({ratings.length})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {ratings.map((rating) => {
              // If we have firstName/lastName, use them directly
              // Otherwise, split userName by space: first part normal, rest bold
              const hasFirstNameLastName = rating.firstName || rating.lastName;
              const nameParts = !hasFirstNameLastName && rating.userName 
                ? rating.userName.split(" ") 
                : null;
              
              return (
                <Card key={rating.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2 flex-1">
                        {hasFirstNameLastName ? (
                          <div className="text-xl">
                            {rating.firstName && (
                              <span className="font-normal">{rating.firstName}</span>
                            )}
                            {rating.firstName && rating.lastName && " "}
                            {rating.lastName && (
                              <span className="font-bold">{rating.lastName}</span>
                            )}
                          </div>
                        ) : nameParts && nameParts.length > 0 ? (
                          <div className="text-xl">
                            <span className="font-normal">{nameParts[0]}</span>
                            {nameParts.length > 1 && (
                              <>
                                {" "}
                                <span className="font-bold">{nameParts.slice(1).join(" ")}</span>
                              </>
                            )}
                          </div>
                        ) : null}
                        {rating.schools && rating.schools.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {rating.schools.map((school, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {school}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-xs flex-shrink-0 cursor-help">
                            <Calendar className="h-3 w-3 mr-1" />
                            <ReactTimeago date={rating.createdAt} />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatDate(rating.createdAt)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Rating */}
                      <div>
                        <StarDisplay rating={rating.rating} size="h-8 w-8" />
                      </div>

                      {rating.questionMetadata &&
                        rating.questionMetadata.questions &&
                        Array.isArray(rating.questionMetadata.questions) &&
                        rating.questionMetadata.questions.length > 0 && (
                          <div className="pt-4 border-t space-y-3">
                            {rating.questionMetadata.questions.map(
                              (q: any, idx: number) => (
                                <div key={idx} className="text-xs text-muted-foreground">
                                  <div className="font-normal">{q.label}</div>
                                  <div className="mt-1 text-sm font-bold">
                                    {q.value !== null && q.value !== undefined
                                      ? String(q.value)
                                      : "N/A"}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}

                      {rating.comment && (
                        <div className="flex items-start gap-2 pt-4 border-t">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground flex-1">
                            {rating.comment}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
            </>
          )}
      </div>

      {/* Edit Example Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Example Review</DialogTitle>
            <DialogDescription>
              Edit the rating questions and example values to preview how reviews will appear to users.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-4">
            {/* Rating Questions Editor */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Rating Questions</h3>
              <CourseRatingQuestionsEditor
                questions={editingQuestions}
                onChange={setEditingQuestions}
              />
            </div>

            {/* Example Rating */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold">Example Rating</h3>
              <div className="flex flex-col items-center gap-2">
                <CourseRatingInput
                  value={editingRating}
                  onChange={setEditingRating}
                  disabled={false}
                  size="h-8 w-8"
                  className="justify-center"
                />
                {editingRating > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {editingRating === 1 && "Poor"}
                    {editingRating === 2 && "Fair"}
                    {editingRating === 3 && "Good"}
                    {editingRating === 4 && "Very Good"}
                    {editingRating === 5 && "Excellent"}
                  </p>
                )}
              </div>
            </div>

            {/* Example Question Answers */}
            {editingQuestions.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold">Example Question Answers</h3>
                <div className="flex flex-col gap-6">
                  {editingQuestions.map((question) => (
                    <QuestionRenderer
                      key={question.id}
                      question={question}
                      value={editingQuestionAnswers[question.id] ?? null}
                      onChange={(value) => {
                        setEditingQuestionAnswers((prev) => ({
                          ...prev,
                          [question.id]: value,
                        }));
                      }}
                      disabled={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Example Comment */}
            <div className="space-y-2 border-t pt-4">
              <label
                htmlFor="example-comment"
                className="text-sm font-medium text-muted-foreground"
              >
                Example Comment
              </label>
              <Textarea
                id="example-comment"
                placeholder="Tell us what you think about this course..."
                value={editingComment}
                onChange={(e) => setEditingComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // Save questions if they changed
                if (JSON.stringify(editingQuestions) !== JSON.stringify(ratingQuestions)) {
                  if (!course) return;
                  
                  setIsSavingQuestions(true);
                  try {
                    const result = await certificationApi.courses.update(course.id, {
                      ratingQuestions: editingQuestions.length > 0 ? editingQuestions : [],
                    });

                    if (result.error) {
                      toast.error(result.error.message || "Failed to save rating questions");
                      return;
                    }

                    setRatingQuestions(editingQuestions);
                    toast.success("Rating questions saved successfully");
                    onCourseUpdated?.();
                  } catch (err) {
                    console.error("Failed to save rating questions:", err);
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to save rating questions. Please try again."
                    );
                    return;
                  } finally {
                    setIsSavingQuestions(false);
                  }
                }

                // Update example values
                setExampleRating(editingRating);
                setExampleComment(editingComment);
                setExampleQuestionAnswers(editingQuestionAnswers);
                setIsEditDialogOpen(false);
                toast.success("Example preview updated");
              }}
              disabled={isSavingQuestions}
            >
              {isSavingQuestions ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
