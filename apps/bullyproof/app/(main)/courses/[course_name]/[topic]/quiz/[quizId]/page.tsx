"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Trophy,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type {
  certificationCourses,
  courseTopics,
  courseTopicQuizzes,
  quizQuestions,
  quizAnswers,
} from "@/server/db/schema";
import { createSlug } from "@/utils/slug";
import { useMeStore } from "@/entities/me/model/store";
import { toast } from "sonner";
import { StarRating } from "@/components/atoms/star-rating";

type Course = typeof certificationCourses.$inferSelect;
type Topic = typeof courseTopics.$inferSelect;
type Quiz = typeof courseTopicQuizzes.$inferSelect;
type QuizQuestion = typeof quizQuestions.$inferSelect;
type QuizAnswer = typeof quizAnswers.$inferSelect;

type QuestionWithAnswers = QuizQuestion & {
  answers: QuizAnswer[];
};

type AttemptAnswer = {
  questionId: string;
  answerIds: string[];
};

function QuizPageContent() {
  const params = useParams();
  const router = useRouter();
  const courseNameSlug = params?.course_name as string;
  const topicSlug = params?.topic as string;
  const quizId = params?.quizId as string;
  usePageTitle(["courses", courseNameSlug, topicSlug, "quiz"]);

  const currentUser = useMeStore((s) => s.currentUser);
  const [course, setCourse] = useState<Course | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([]);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, string[]>>(new Map());
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  // Fetch course by slug
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseNameSlug) return;

      try {
        const result = await certificationApi.courses.bySlug(courseNameSlug);
        if (result.data) {
          setCourse(result.data);
        } else {
          setError(result.error?.message ?? "Failed to fetch course");
        }
      } catch (err) {
        console.error("Failed to fetch course:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch course");
      }
    };

    fetchCourse();
  }, [courseNameSlug]);

  // Fetch topic, quiz, questions, and start/resume attempt
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!course || !topicSlug || !quizId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch all topics for this course
        const topicsResult = await certificationApi.topics.byCourseCode(course.code);
        if (!topicsResult.data) {
          setError(topicsResult.error?.message ?? "Failed to fetch topics");
          return;
        }

        // Find the topic with matching slug
        const foundTopic = topicsResult.data.find(
          (t) => createSlug(t.title) === topicSlug
        );

        if (!foundTopic) {
          setError("Topic not found");
          return;
        }

        setTopic(foundTopic);

        // Fetch quiz details with enriched data (includes questions and answers)
        const quizResult = await certificationApi.quizzes.byId(quizId);
        if (!quizResult.data) {
          setError(quizResult.error?.message ?? "Quiz not found");
          return;
        }

        const enrichedQuiz = quizResult.data as any;
        setQuiz(enrichedQuiz);

        // Extract questions from enriched quiz response
        // The questions field is a JSONB array with nested answers (already transformed to camelCase)
        const questionsFromEnriched = enrichedQuiz.questions || [];
        
        // Ensure questions are sorted by orderIndex (should already be sorted from view, but ensure it)
        const questionsWithAnswers = questionsFromEnriched
          .map((q: any) => ({
            ...q,
            // Ensure answers are sorted by orderIndex
            answers: (q.answers || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex),
          }))
          .sort((a: any, b: any) => a.orderIndex - b.orderIndex);

        setQuestions(questionsWithAnswers);

        // Start or resume quiz attempt
        if (currentUser) {
          try {
            // Get topic progress to find topicProgressId
            const topicProgressResult = await fetch(
              `/api/certification/topics/${foundTopic.id}/progress`
            ).catch(() => null);

            let topicProgressId: string | null = null;
            if (topicProgressResult?.ok) {
              const progressData = await topicProgressResult.json();
              topicProgressId = progressData?.id || null;
            }

            const startResult = await certificationApi.quizzes.start(quizId, {
              courseId: course.id,
              topicProgressId,
            });

            if (startResult.data) {
              setAttempt(startResult.data);

              // If resuming, fetch existing answers
              if (startResult.data.id) {
                const existingAnswersResult = await certificationApi.quizzes.attempts.answers.list(
                  quizId,
                  startResult.data.id
                );

                if (existingAnswersResult.data) {
                  const answersMap = new Map<string, string[]>();
                  existingAnswersResult.data.forEach((answer: any) => {
                    const questionId = answer.questionId;
                    if (!answersMap.has(questionId)) {
                      answersMap.set(questionId, []);
                    }
                    answersMap.get(questionId)!.push(answer.answerId);
                    setSubmittedAnswers((prev) => new Set(prev).add(questionId));
                  });
                  setSelectedAnswers(answersMap);
                }
              }
            }
          } catch (err) {
            console.error("Failed to start quiz attempt:", err);
            // Continue without attempt - user can still view questions
          }
        }
      } catch (err) {
        console.error("Failed to fetch quiz data:", err);
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [course, topicSlug, quizId, currentUser]);

  const handleSubmitAnswer = useCallback(
    async (questionId: string, answerIdsOverride?: string[]) => {
      if (!attempt || !quizId) return;

      const answerIds = answerIdsOverride || selectedAnswers.get(questionId) || [];
      if (answerIds.length === 0) {
        toast.error("Please select an answer");
        return;
      }

      setIsSubmitting(true);
      try {
        // Get existing answers for this question
        const existingAnswersResult = await certificationApi.quizzes.attempts.answers.list(
          quizId,
          attempt.id
        );
        const existingAnswers = existingAnswersResult.data || [];
        const existingAnswerIds = existingAnswers
          .filter((a: any) => a.questionId === questionId)
          .map((a: any) => a.answerId);

        // For multiple choice, we need to handle adding/removing answers
        // For single choice, replace the answer
        const currentQuestion = questions.find((q) => q.id === questionId);
        const isMultiple = currentQuestion?.allowMultipleSelections ?? false;

        if (isMultiple) {
          // Multiple choice: sync selected answers with submitted answers
          // Remove answers that are no longer selected
          for (const existingId of existingAnswerIds) {
            if (!answerIds.includes(existingId)) {
              // The PUT endpoint removes oldAnswerId and adds a new answerId
              // If there are still selected answers, use the first one
              // Otherwise, this shouldn't happen due to the early return check above
              const newAnswerId = answerIds.length > 0 ? answerIds[0] : existingId;
              await certificationApi.quizzes.attempts.answers.update(quizId, attempt.id, {
                questionId,
                answerId: newAnswerId,
                oldAnswerId: existingId,
              });
            }
          }

          // Add new answers that aren't already submitted
          for (const answerId of answerIds) {
            if (!existingAnswerIds.includes(answerId)) {
              await certificationApi.quizzes.attempts.answers.submit(quizId, attempt.id, {
                questionId,
                answerId,
              });
            }
          }
        } else {
          // Single choice: replace answer if different
          const answerId = answerIds[0];
          const existingAnswer = existingAnswers.find(
            (a: any) => a.questionId === questionId
          );

          if (existingAnswer) {
            if (existingAnswer.answerId !== answerId) {
              await certificationApi.quizzes.attempts.answers.update(quizId, attempt.id, {
                questionId,
                answerId,
                oldAnswerId: existingAnswer.answerId,
              });
            }
          } else {
            await certificationApi.quizzes.attempts.answers.submit(quizId, attempt.id, {
              questionId,
              answerId,
            });
          }
        }

        setSubmittedAnswers((prev) => new Set(prev).add(questionId));
        toast.success("Answer saved");
      } catch (err) {
        console.error("Failed to submit answer:", err);
        toast.error("Failed to save answer");
      } finally {
        setIsSubmitting(false);
      }
    },
    [attempt, quizId, selectedAnswers, questions]
  );

  const handleAnswerSelect = useCallback(
    (questionId: string, answerId: string, isMultiple: boolean) => {
      // Calculate new answer IDs from current state before updating
      // Read from selectedAnswers state (may be slightly stale but acceptable for this use case)
      const currentAnswers = selectedAnswers.get(questionId) || [];
      const isSubmitted = submittedAnswers.has(questionId);
      let newAnswerIds: string[];

      if (isMultiple) {
        // Multiple choice: toggle answer
        if (currentAnswers.includes(answerId)) {
          newAnswerIds = currentAnswers.filter((id) => id !== answerId);
        } else {
          newAnswerIds = [...currentAnswers, answerId];
        }
      } else {
        // Single choice: replace answer
        newAnswerIds = [answerId];
      }

      // Prevent deselection if answer has been submitted
      if (isSubmitted) {
        // For single choice: prevent selecting the same answer (no change)
        // RadioGroup doesn't allow true deselection, but we prevent unnecessary updates
        if (!isMultiple && currentAnswers.length > 0 && currentAnswers[0] === answerId) {
          // Already selected this answer, no change needed
          return;
        }
        
        // For multiple choice: prevent deselecting if it would result in no answers
        if (isMultiple && newAnswerIds.length === 0) {
          toast.error("Cannot deselect all answers - at least one answer must remain selected.");
          return;
        }
      }

      // Update state with new answer IDs
      setSelectedAnswers((prev) => {
        const newMap = new Map(prev);
        newMap.set(questionId, newAnswerIds);
        return newMap;
      });

      // Auto-save the answer using the calculated value
      if (newAnswerIds.length > 0 && attempt && quizId) {
        handleSubmitAnswer(questionId, newAnswerIds);
      }
    },
    [attempt, quizId, handleSubmitAnswer, selectedAnswers, submittedAnswers]
  );

  const handleNextQuestion = useCallback(async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const currentQuestion = questions[currentQuestionIndex];
      const answerIds = selectedAnswers.get(currentQuestion.id) || [];
      
      // Save answer before moving to next question if there are unsaved answers
      if (answerIds.length > 0 && !submittedAnswers.has(currentQuestion.id)) {
        await handleSubmitAnswer(currentQuestion.id);
      }
      
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, questions, selectedAnswers, submittedAnswers, handleSubmitAnswer]);

  const handlePrevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  const handleSubmitQuiz = useCallback(async () => {
    if (!attempt || !quizId) return;

    setIsSubmittingQuiz(true);
    try {
      // Submit all unanswered questions first
      for (const question of questions) {
        if (!submittedAnswers.has(question.id)) {
          const answerIds = selectedAnswers.get(question.id);
          if (answerIds && answerIds.length > 0) {
            await certificationApi.quizzes.attempts.answers.submit(quizId, attempt.id, {
              questionId: question.id,
              answerId: answerIds[0],
            });
          }
        }
      }

      // Submit quiz
      const submitResult = await certificationApi.quizzes.attempts.submit(quizId, attempt.id);
      if (submitResult.data) {
        setResults(submitResult.data);
        setShowResults(true);
      } else {
        toast.error(submitResult.error?.message ?? "Failed to submit quiz");
      }
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      toast.error("Failed to submit quiz");
    } finally {
      setIsSubmittingQuiz(false);
    }
  }, [attempt, quizId, questions, selectedAnswers, submittedAnswers]);

  const handleBackToOverview = () => {
    if (!courseNameSlug || !topicSlug) return;
    router.push(`/courses/${courseNameSlug}/${topicSlug}/quiz`);
  };

  const handleBackToCourse = () => {
    if (!courseNameSlug) return;
    router.push(`/courses/${courseNameSlug}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quiz || questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              {error || "Quiz not found or has no questions"}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleBackToOverview} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quiz Overview
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const currentAnswers = selectedAnswers.get(currentQuestion.id) || [];
  const isAnswered = currentAnswers.length > 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allQuestionsAnswered = questions.every((q) => {
    const answers = selectedAnswers.get(q.id);
    return answers && answers.length > 0;
  });

  // Results dialog
  if (showResults && results) {
    const scorePercentage = results.scorePercentage ?? 0;
    const isPassed = results.isPassed ?? false;
    const correctAnswers = results.correctAnswers ?? 0;
    const totalQuestions = results.totalQuestions ?? questions.length;

    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isPassed ? (
                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4">
                  <Trophy className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
                  <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
              )}
            </div>
            <CardTitle className="text-3xl">
              {isPassed ? "Quiz Passed!" : "Quiz Failed"}
            </CardTitle>
            <div className="flex justify-center mt-4">
              <StarRating
                correctAnswers={correctAnswers}
                totalQuestions={totalQuestions}
                passingThreshold={quiz.passingScorePercentage}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                You answered {correctAnswers} out of {totalQuestions} questions correctly.
              </p>
              <p className="text-sm text-muted-foreground">
                Passing score: {quiz.passingScorePercentage}%
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button onClick={handleBackToOverview} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={handleBackToCourse} className="w-full">
              Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={handleBackToOverview}
          variant="ghost"
          size="sm"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Quiz Overview
        </Button>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-muted-foreground mt-1">{quiz.description}</p>
            )}
          </div>
          <Badge variant="outline">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
          <span>Passing score: {quiz.passingScorePercentage}%</span>
          {quiz.timeLimitMinutes && (
            <span>Time limit: {quiz.timeLimitMinutes} minutes</span>
          )}
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {currentQuestion.questionText}
          </CardTitle>
          {currentQuestion.explanation && (
            <CardDescription>{currentQuestion.explanation}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {currentQuestion.questionType === "single_choice" ||
          currentQuestion.questionType === "true_false" ? (
            <RadioGroup
              value={currentAnswers[0] || ""}
              onValueChange={(value) => {
                // Prevent selecting the same answer if already submitted
                const isSubmitted = submittedAnswers.has(currentQuestion.id);
                if (isSubmitted && currentAnswers[0] === value) {
                  return; // Don't allow deselection
                }
                handleAnswerSelect(currentQuestion.id, value, false);
              }}
              className="space-y-3"
            >
              {currentQuestion.answers.map((answer) => {
                const isSelected = currentAnswers[0] === answer.id;
                const isSubmitted = submittedAnswers.has(currentQuestion.id);
                const isDisabled = isSubmitted && isSelected;
                
                return (
                  <div
                    key={answer.id}
                    className={`flex items-center space-x-3 p-4 border rounded-lg ${
                      isDisabled 
                        ? "opacity-60 cursor-not-allowed" 
                        : "hover:bg-accent cursor-pointer"
                    }`}
                    onClick={() => {
                      if (!isDisabled) {
                        handleAnswerSelect(currentQuestion.id, answer.id, false);
                      }
                    }}
                  >
                    <RadioGroupItem 
                      value={answer.id} 
                      id={answer.id}
                      disabled={isDisabled}
                    />
                    <Label
                      htmlFor={answer.id}
                      className={`flex-1 ${
                        isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                      } font-normal`}
                    >
                      {answer.answerText}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          ) : (
            <div className="space-y-3">
              {currentQuestion.answers.map((answer) => {
                const isSelected = currentAnswers.includes(answer.id);
                const isSubmitted = submittedAnswers.has(currentQuestion.id);
                // For multiple choice: disable if submitted, selected, and it's the last answer
                const isDisabled = isSubmitted && 
                  isSelected && 
                  currentAnswers.length === 1 &&
                  (currentQuestion.allowMultipleSelections ?? false);
                
                return (
                  <div
                    key={answer.id}
                    className={`flex items-center space-x-3 p-4 border rounded-lg ${
                      isDisabled 
                        ? "opacity-60 cursor-not-allowed" 
                        : "hover:bg-accent cursor-pointer"
                    }`}
                    onClick={() => {
                      if (!isDisabled) {
                        handleAnswerSelect(
                          currentQuestion.id,
                          answer.id,
                          currentQuestion.allowMultipleSelections ?? false
                        );
                      }
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => {
                        if (!isDisabled) {
                          handleAnswerSelect(
                            currentQuestion.id,
                            answer.id,
                            currentQuestion.allowMultipleSelections ?? false
                          );
                        }
                      }}
                      id={answer.id}
                    />
                    <Label
                      htmlFor={answer.id}
                      className={`flex-1 ${
                        isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                      } font-normal`}
                    >
                      {answer.answerText}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <div className="flex gap-2">
            {isLastQuestion ? (
              <Button
                onClick={handleSubmitQuiz}
                disabled={!allQuestionsAnswered || isSubmittingQuiz}
                size="lg"
              >
                {isSubmittingQuiz ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Quiz"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                disabled={!isAnswered}
                size="lg"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <QuizPageContent />
    </Suspense>
  );
}
