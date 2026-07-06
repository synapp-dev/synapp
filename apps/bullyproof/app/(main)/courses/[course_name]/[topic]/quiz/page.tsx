"use client";

import type {
  CertificationCourseRow,
  CourseTopicQuizRow,
  CourseTopicRow,
  QuizQuestionRow,
} from "@/types/db";
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
import { createSlug } from "@/utils/slug";
import { useMeStore } from "@/entities/me/model/store";
import { StarRating } from "@/components/atoms/star-rating";

type Course = CertificationCourseRow;
type Topic = CourseTopicRow;
type Quiz = CourseTopicQuizRow;
type QuizQuestion = QuizQuestionRow;

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
              Course Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={handleBackToCourse}
          variant="ghost"
          size="sm"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Course Home
        </Button>
        <h2 className="text-xl font-semibold mb-1 text-muted-foreground">
          {course?.name ?? "Course"}
        </h2>
        <h1 className="text-3xl font-bold">
          {topic?.title ?? "Topic Quizzes"}
        </h1>
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
            <Card key={quiz.id} className="hover:shadow-md transition-shadow max-w-md mx-auto">
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
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    This quiz will test your knowledge of the slides you just read.
                  </p>
                  <p>
                    There will be <span className="font-bold">{quiz.questionCount}</span> {quiz.questionCount === 1 ? "question" : "questions"} in total.
                  </p>
                  <p>
                    You must get a score of <span className="font-bold">{quiz.passingScorePercentage}%</span> or more in order to progress to the next topic.
                  </p>
                  <div className="pt-2">
                    <p>You may retake the test as many times as you wish.</p>
                  </div>
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
