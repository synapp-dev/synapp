"use client";

import type { CertificationCourseRow, CourseTopicQuizRow, CourseTopicRow, QuizAnswerRow, QuizQuestionRow } from "@/types/db";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Loader2,
  ArrowLeft,
  XCircle,
  Trophy,
  ChevronsRight,
  ChevronsLeft,
  RotateCcw,
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


import { certificationApi } from "@/entities/certification/api/endpoints";
import { useMeStore } from "@/entities/me/model/store";
import { StarRating } from "@/components/atoms/star-rating";
import { renderQuestionWithUrls } from "@/utils/parse-question-urls";

type Course = CertificationCourseRow;
type Topic = CourseTopicRow;
type Quiz = CourseTopicQuizRow;
type QuizQuestion = QuizQuestionRow;
type QuizAnswer = QuizAnswerRow;

type QuestionWithAnswers = QuizQuestion & {
  answers: QuizAnswer[];
};

function QuizPageContent() {
  const params = useParams();
  const router = useRouter();
  const courseNameSlug = params?.course_name as string;
  const topicSlug = params?.topic as string;
  const quizSlug = params?.quizSlug as string;
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
  const [submittingQuestions, setSubmittingQuestions] = useState<Set<string>>(new Set()); // Track which questions are being submitted
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  // Fetch all quiz data in a single API call
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!courseNameSlug || !topicSlug || !quizSlug || !currentUser) return;

      try {
        setIsLoading(true);
        setError(null);

        // Single API call to get all quiz data
        const result = await certificationApi.quizzes.bySlugs(
          courseNameSlug,
          topicSlug,
          quizSlug
        );

        if (!result.data) {
          setError(result.error?.message ?? "Failed to fetch quiz data");
          return;
        }

        const {
          quiz: enrichedQuiz,
          attempt: quizAttempt,
          existingAnswers,
          earliestUnansweredQuestionIndex,
          course: courseData,
          topic: topicData,
        } = result.data;

        // Set course and topic
        setCourse(courseData);
        setTopic(topicData);

        // Set quiz
        setQuiz(enrichedQuiz);

        // Extract and sort questions from enriched quiz response
        const questionsFromEnriched = enrichedQuiz.questions || [];
        const questionsWithAnswers = questionsFromEnriched
          .map((q: any) => ({
            ...q,
            // Ensure answers are sorted by orderIndex
            answers: (q.answers || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex),
          }))
          .sort((a: any, b: any) => a.orderIndex - b.orderIndex);

        setQuestions(questionsWithAnswers);

        // Set attempt
        setAttempt(quizAttempt);

        // Set current question index to earliest unanswered question
        if (earliestUnansweredQuestionIndex >= 0) {
          setCurrentQuestionIndex(earliestUnansweredQuestionIndex);
        }

        // Process existing answers (now stored as JSONB array in answerIds)
        if (existingAnswers && existingAnswers.length > 0) {
          const answersMap = new Map<string, string[]>();
          existingAnswers.forEach((answer: any) => {
            const questionId = answer.questionId;
            // Handle both old format (answerId) and new format (answerIds JSONB)
            let answerIds: string[] = [];
            if (answer.answerIds) {
              // New format: answerIds is a JSONB array
              answerIds = Array.isArray(answer.answerIds) 
                ? answer.answerIds 
                : JSON.parse(answer.answerIds);
            } else if (answer.answerId) {
              // Old format: single answerId (for backward compatibility during migration)
              answerIds = [answer.answerId];
            }
            
            if (answerIds.length > 0) {
              answersMap.set(questionId, answerIds);
              setSubmittedAnswers((prev) => new Set(prev).add(questionId));
            }
          });
          setSelectedAnswers(answersMap);
        }
      } catch (err) {
        console.error("Failed to fetch quiz data:", err);
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [courseNameSlug, topicSlug, quizSlug, currentUser]);

  const handleSubmitAnswer = useCallback(
    async (questionId: string, answerIdsOverride?: string[]) => {
      if (!attempt || !quiz) return;

      const answerIds = answerIdsOverride || selectedAnswers.get(questionId) || [];
      if (answerIds.length === 0) {
        return;
      }

      // Prevent concurrent submissions for the same question
      if (submittingQuestions.has(questionId)) {
        return;
      }

      setSubmittingQuestions((prev) => new Set(prev).add(questionId));
      try {
        // Simple: just submit/upsert the current answer IDs for this question
        // The backend handles upsert logic to prevent duplicates
        await certificationApi.quizzes.attempts.answers.submit(quiz.id, attempt.id, {
          questionId,
          answerIds,
        });

        setSubmittedAnswers((prev) => new Set(prev).add(questionId));
      } catch (err) {
        console.error("Failed to submit answer:", err);
      } finally {
        setSubmittingQuestions((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
      }
    },
    [attempt, quiz, selectedAnswers, submittingQuestions]
  );

  const handleAnswerSelect = useCallback(
    (questionId: string, answerId: string, isMultiple: boolean) => {
      // Don't allow selection changes while submitting
      if (submittingQuestions.has(questionId)) {
        return;
      }

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
      if (newAnswerIds.length > 0 && attempt && quiz) {
        handleSubmitAnswer(questionId, newAnswerIds);
      }
    },
    [attempt, quiz, handleSubmitAnswer, selectedAnswers, submittedAnswers, submittingQuestions]
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
    if (!attempt || !quiz) return;

    setIsSubmittingQuiz(true);
    try {
      // Submit all unanswered questions first
      for (const question of questions) {
        if (!submittedAnswers.has(question.id)) {
          const answerIds = selectedAnswers.get(question.id);
          if (answerIds && answerIds.length > 0) {
            await certificationApi.quizzes.attempts.answers.submit(quiz.id, attempt.id, {
              questionId: question.id,
              answerIds,
            });
          }
        }
      }

      // Submit quiz
      const submitResult = await certificationApi.quizzes.attempts.submit(quiz.id, attempt.id);
      if (submitResult.data) {
        setResults(submitResult.data);
        setShowResults(true);
      }
    } catch (err) {
      console.error("Failed to submit quiz:", err);
    } finally {
      setIsSubmittingQuiz(false);
    }
  }, [attempt, quiz, questions, selectedAnswers, submittedAnswers]);

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
    const isPassed = results.isPassed ?? false;
    const correctAnswers = results.correctAnswers ?? 0;
    const totalQuestions = results.totalQuestions ?? questions.length;

    return (
      <>
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
                  size="h-8 w-8"
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
              {correctAnswers !== totalQuestions && (
                <Button onClick={handleBackToOverview} variant="outline" className="w-full flex items-center gap-2"> 
                  <RotateCcw className="h-4 w-4" />
                  Retake Quiz
                </Button>
              )}
              <Button onClick={handleBackToCourse} className="w-full flex items-center gap-2">
                <ChevronsLeft className="h-4 w-4" />

                Return to Course
              </Button>
            </CardFooter>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
      
        <div className="mb-4 flex flex-row items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {course?.name ?? "Course"}
          </p>
          <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
          <p className="text-sm text-muted-foreground">
            {topic?.title ?? "Topic"}
          </p>
        </div>
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
        <Progress 
          value={progress} 
          className="h-2" 
          indicatorStyle={{ backgroundColor: 'var(--brand-bullyproof-primary)' }}
        />
        {quiz.timeLimitMinutes && (
          <div className="flex items-center justify-end mt-2 text-sm text-muted-foreground">
            <span>Time limit: {quiz.timeLimitMinutes} minutes</span>
          </div>
        )}
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {renderQuestionWithUrls(
              currentQuestion.questionText, 
              (currentQuestion.questionUrls as Record<string, string> | null | undefined) ?? null
            )}
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
                const isSubmitting = submittingQuestions.has(currentQuestion.id);
                const isDisabled = (isSubmitted && isSelected) || isSubmitting;
                const isSaving = isSubmitting && isSelected;
                
                return (
                  <div
                    key={answer.id}
                    className={`flex items-center space-x-3 p-4 border rounded-lg ${
                      isDisabled 
                        ? "opacity-60 cursor-not-allowed" 
                        : "hover:bg-accent cursor-pointer"
                    } ${isSaving ? "animate-pulse" : ""} ${
                      isSelected ? "border-[var(--brand-bullyproof-primary)]" : ""
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
                      className={isSelected ? "[&_svg]:fill-[var(--brand-bullyproof-primary)]" : ""}
                    />
                    <Label
                      htmlFor={answer.id}
                      key={`${answer.id}-${isSaving ? 'saving' : 'normal'}`}
                      className={`flex-1 ${
                        isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                      } ${isSelected ? "font-bold" : "font-normal"} animate-slide-left-fade-in`}
                    >
                      {isSaving ? "Saving answer..." : answer.answerText}
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
                const isSubmitting = submittingQuestions.has(currentQuestion.id);
                // For multiple choice: disable if submitted, selected, and it's the last answer
                // Also disable while submitting to prevent rapid clicks
                const isDisabled = isSubmitting || (
                  isSubmitted && 
                  isSelected && 
                  currentAnswers.length === 1 &&
                  (currentQuestion.allowMultipleSelections ?? false)
                );
                const isSaving = isSubmitting && isSelected;
                
                return (
                  <div
                    key={answer.id}
                    className={`flex items-center space-x-3 p-4 border rounded-lg ${
                      isDisabled 
                        ? "opacity-60 cursor-not-allowed" 
                        : "hover:bg-accent cursor-pointer"
                    } ${isSaving ? "animate-pulse" : ""} ${
                      isSelected ? "border-[var(--brand-bullyproof-primary)]" : ""
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
                      className={isSelected ? "data-[state=checked]:bg-[var(--brand-bullyproof-primary)] data-[state=checked]:border-[var(--brand-bullyproof-primary)]" : ""}
                    />
                    <Label
                      htmlFor={answer.id}
                      key={`${answer.id}-${isSaving ? 'saving' : 'normal'}`}
                      className={`flex-1 ${
                        isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                      } ${isSelected ? "font-bold" : "font-normal"} animate-slide-left-fade-in`}
                    >
                      {isSaving ? "Saving answer..." : answer.answerText}
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
                className={`bg-[var(--brand-bullyproof-primary)] hover:bg-[var(--brand-bullyproof-primary)]/90 text-white`}
              >
                Next
                <ChevronsRight className={`h-4 w-4 ${isAnswered ? "animate-bounce-right-subtle" : ""}`} />
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
