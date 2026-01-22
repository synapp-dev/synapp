"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { Loader2, ArrowLeft, FileQuestion, CheckCircle2, XCircle, Clock } from "lucide-react";
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
import { certificationApi } from "@/entities/certification/api/endpoints";
import type {
  certificationCourses,
  courseTopics,
  courseTopicQuizzes,
  quizQuestions,
} from "@/server/db/schema";
import { createSlug } from "@/utils/slug";
import { useMeStore } from "@/entities/me/model/store";
import { StarRating } from "@/components/atoms/star-rating";

type Course = typeof certificationCourses.$inferSelect;
type Topic = typeof courseTopics.$inferSelect;
type Quiz = typeof courseTopicQuizzes.$inferSelect;
type QuizQuestion = typeof quizQuestions.$inferSelect;

type QuizWithDetails = Quiz & {
  questionCount: number;
  status?: "not_started" | "in_progress" | "passed" | "failed";
  latestScore?: number | null;
};

function QuizOverviewPageContent() {
  const params = useParams();
  const router = useRouter();
  const courseNameSlug = params?.course_name as string;
  const topicSlug = params?.topic as string;
  usePageTitle(["courses", courseNameSlug, topicSlug, "quiz"]);

  const [course, setCourse] = useState<Course | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [quizzes, setQuizzes] = useState<QuizWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useMeStore((s) => s.currentUser);

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

  // Fetch topic and quizzes
  useEffect(() => {
    const fetchTopicAndQuizzes = async () => {
      if (!course || !topicSlug) return;

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

        // Fetch all quizzes for this topic
        const quizzesResult = await certificationApi.quizzes.list(foundTopic.id);
        if (!quizzesResult.data) {
          setError(quizzesResult.error?.message ?? "Failed to fetch quizzes");
          return;
        }

        // Fetch question count for each quiz
        const quizzesWithDetails = await Promise.all(
          quizzesResult.data.map(async (quiz) => {
            // Fetch questions to get count
            const questionsResult = await certificationApi.quizzes.questions.list(quiz.id);
            const questionCount = questionsResult.data?.length ?? 0;

            return {
              ...quiz,
              questionCount,
              status: "not_started" as const,
              latestScore: null,
            };
          })
        );

        // Filter out quizzes with no questions
        const validQuizzes = quizzesWithDetails.filter((q) => q.questionCount > 0);
        setQuizzes(validQuizzes);
      } catch (err) {
        console.error("Failed to fetch topic and quizzes:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch quizzes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopicAndQuizzes();
  }, [course, topicSlug, currentUser]);

  const handleStartQuiz = (quiz: QuizWithDetails) => {
    if (!courseNameSlug || !topicSlug) return;
    const quizSlug = createSlug(quiz.title);
    router.push(`/courses/${courseNameSlug}/${topicSlug}/quiz/${quizSlug}`);
  };

  const handleBackToCourse = () => {
    if (!courseNameSlug) return;
    router.push(`/courses/${courseNameSlug}`);
  };

  const handleBackToSlides = () => {
    if (!courseNameSlug || !topicSlug) return;
    router.push(`/courses/${courseNameSlug}/${topicSlug}/slides`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleBackToCourse} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Course
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
          onClick={handleBackToCourse}
          variant="ghost"
          size="sm"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>
        <h1 className="text-3xl font-bold mb-2">
          {topic?.title ?? "Topic Quizzes"}
        </h1>
        <p className="text-muted-foreground">
          {course?.name ?? "Course"} • {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"} available
        </p>
      </div>

      {/* Quizzes List */}
      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No quizzes available</h3>
              <p className="text-sm text-muted-foreground mb-6">
                There are no quizzes available for this topic yet.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleBackToSlides} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Slides
                </Button>
                <Button onClick={handleBackToCourse}>Back to Course</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{quiz.title}</CardTitle>
                    {quiz.description && (
                      <CardDescription className="mt-2">
                        {quiz.description}
                      </CardDescription>
                    )}
                  </div>
                  {quiz.status === "passed" && (
                    <Badge variant="default" className="ml-4">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Passed
                    </Badge>
                  )}
                  {quiz.status === "failed" && (
                    <Badge variant="destructive" className="ml-4">
                      <XCircle className="mr-1 h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                  {quiz.status === "in_progress" && (
                    <Badge variant="secondary" className="ml-4">
                      <Clock className="mr-1 h-3 w-3" />
                      In Progress
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileQuestion className="h-4 w-4" />
                    <span>{quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Passing score: {quiz.passingScorePercentage}%</span>
                  </div>
                  {quiz.timeLimitMinutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Time limit: {quiz.timeLimitMinutes} minutes</span>
                    </div>
                  )}
                  {quiz.latestScore !== null && quiz.latestScore !== undefined && (
                    <div className="flex items-center gap-1">
                      <span>Latest score:</span>
                      <StarRating
                        correctAnswers={Math.round((quiz.latestScore / 100) * quiz.questionCount)}
                        totalQuestions={quiz.questionCount}
                        passingThreshold={quiz.passingScorePercentage}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleStartQuiz(quiz)}
                  className="w-full"
                  size="lg"
                >
                  {quiz.status === "in_progress" ? "Continue Quiz" : "Start Quiz"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuizOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <QuizOverviewPageContent />
    </Suspense>
  );
}
