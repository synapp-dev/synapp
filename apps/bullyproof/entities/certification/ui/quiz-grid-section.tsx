"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { quizQuestions, quizAnswers } from "@/server/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Loader2,
  ArrowLeft,
  Plus,
  FileQuestion,
  Check,
  Pencil,
  FileText,
  Trash,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import type { courseTopics, certificationCourses } from "@/server/db/schema";

type Topic = typeof courseTopics.$inferSelect;
type Course = typeof certificationCourses.$inferSelect;
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  QuizSlideEditor,
  type QuizData,
} from "@/components/organisms/quiz-slide-editor";
import { EditQuizSettingsDrawer } from "./edit-quiz-settings-drawer";
import { renderQuestionWithUrls } from "@/utils/parse-question-urls";

type QuizQuestion = typeof quizQuestions.$inferSelect;
type QuizAnswer = typeof quizAnswers.$inferSelect;

type QuizQuestionWithAnswers = QuizQuestion & {
  answers: QuizAnswer[];
};

interface QuizGridSectionProps {
  topicId: string;
}

export function QuizGridSection({ topicId }: QuizGridSectionProps) {
  const router = useRouter();
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionWithAnswers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuizQuestionWithAnswers | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedQuizData, setEditedQuizData] = useState<QuizData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewQuestion, setIsNewQuestion] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isEditQuizSettingsDrawerOpen, setIsEditQuizSettingsDrawerOpen] = useState(false);

  // Helper function to get or create a quiz for the topic
  const getOrCreateQuiz = useCallback(async (): Promise<string> => {
    // Check if we already have a quizId in state
    if (quizId) return quizId;

    // Try to get existing quizzes for the topic
    const quizzesResult = await certificationApi.quizzes.list(topicId);
    if (quizzesResult.data && quizzesResult.data.length > 0) {
      const firstQuiz = quizzesResult.data[0];
      setQuizId(firstQuiz.id);
      return firstQuiz.id;
    }

    // Create a new quiz if none exists
    const createResult = await certificationApi.quizzes.create({
      topicId,
      title: "Topic Quiz",
      description: null,
      passingScorePercentage: 70,
      isRequired: true,
      sequenceType: "sequential",
    });

    if (!createResult.data) {
      throw new Error(createResult.error?.message || "Failed to create quiz");
    }

    setQuizId(createResult.data.id);
    return createResult.data.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  // Helper function to map QuizQuestion + QuizAnswers to QuizData
  const mapQuestionToQuizData = (question: QuizQuestionWithAnswers): QuizData => {
    return {
      question: question.questionText,
      answers: question.answers.map((answer) => ({
        id: answer.id,
        text: answer.answerText,
        isCorrect: answer.isCorrect,
      })),
      questionUrls: (question as any).questionUrls || null,
    };
  };

  // Fetch topic data
  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const topicResult = await certificationApi.topics.byId(topicId);
        if (topicResult.data) {
          setTopic(topicResult.data);
          // Try to get course info if available
          // Note: The topic might not include course data, so we may need to fetch it separately
        }
      } catch (err) {
        console.error("Failed to fetch topic:", err);
      }
    };

    fetchTopic();
  }, [topicId]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const currentQuizId = await getOrCreateQuiz();
        
        // Fetch quiz questions
        const questionsResult = await certificationApi.quizzes.questions.list(currentQuizId);
        if (!questionsResult.data) {
          setError(
            questionsResult.error?.message ?? "Failed to fetch quiz questions"
          );
          return;
        }

        // Fetch answers for each question
        const questionsWithAnswers = await Promise.all(
          questionsResult.data.map(async (question) => {
            const answersResult = await certificationApi.quizzes.questions.answers.list(
              currentQuizId,
              question.id
            );
            return {
              ...question,
              answers: answersResult.data || [],
            };
          })
        );

        // Sort by orderIndex
        questionsWithAnswers.sort((a, b) => a.orderIndex - b.orderIndex);
        setQuestions(questionsWithAnswers);
      } catch (err) {
        console.error("Failed to fetch quiz questions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch quiz questions"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [topicId, getOrCreateQuiz]);

  const handleQuestionClick = (question: QuizQuestionWithAnswers) => {
    setSelectedQuestion(question);
    setEditedQuizData(mapQuestionToQuizData(question));
    setIsNewQuestion(false);
    setIsDialogOpen(true);
    setHasUnsavedChanges(false);
  };

  const handleAddQuiz = () => {
    setSelectedQuestion(null);
    setEditedQuizData({
      question: "",
      answers: [
        { id: `answer_${Date.now()}_1`, text: "", isCorrect: false },
        { id: `answer_${Date.now()}_2`, text: "", isCorrect: false },
      ],
    });
    setIsNewQuestion(true);
    setIsDialogOpen(true);
    setHasUnsavedChanges(false);
  };

  const handleSave = async () => {
    if (!editedQuizData) return;

    setIsSaving(true);
    try {
      const currentQuizId = await getOrCreateQuiz();
      
      // Validate quiz data
      const validAnswers = editedQuizData.answers.filter((a) => a.text.trim().length > 0);
      if (validAnswers.length < 2) {
        throw new Error("At least 2 answer options are required");
      }
      if (!validAnswers.some((a) => a.isCorrect)) {
        throw new Error("At least one answer must be marked as correct");
      }
      if (!editedQuizData.question.trim()) {
        throw new Error("Question text is required");
      }

      let questionId: string;

      if (isNewQuestion || !selectedQuestion) {
        // Create new question
        const questionResult = await certificationApi.quizzes.questions.create(
          currentQuizId,
          {
            questionText: editedQuizData.question.trim(),
            questionType: "multiple_choice",
            allowMultipleSelections: false,
            explanation: null,
            points: 1,
            orderIndex: questions.length,
            questionUrls: editedQuizData.questionUrls || null,
          }
        );

        if (!questionResult.data) {
          throw new Error(questionResult.error?.message || "Failed to create question");
        }

        questionId = questionResult.data.id;
      } else {
        // Update existing question
        questionId = selectedQuestion.id;
        const updateResult = await certificationApi.quizzes.questions.update(
          currentQuizId,
          questionId,
          {
            questionText: editedQuizData.question.trim(),
            questionUrls: editedQuizData.questionUrls || null,
          }
        );

        if (!updateResult.data) {
          throw new Error(updateResult.error?.message || "Failed to update question");
        }

        // Delete existing answers
        const existingAnswers = selectedQuestion.answers;
        for (const answer of existingAnswers) {
          await certificationApi.quizzes.questions.answers.delete(
            currentQuizId,
            questionId,
            answer.id
          );
        }
      }

      // Create new answers
      for (let i = 0; i < validAnswers.length; i++) {
        const answer = validAnswers[i];
        const answerResult = await certificationApi.quizzes.questions.answers.create(
          currentQuizId,
          questionId,
          {
            answerText: answer.text.trim(),
            isCorrect: answer.isCorrect,
            orderIndex: i,
          }
        );

        if (!answerResult.data) {
          throw new Error(answerResult.error?.message || "Failed to create answer");
        }
      }

      toast.success("Quiz question saved successfully");
      setIsDialogOpen(false);
      setHasUnsavedChanges(false);
      setIsNewQuestion(false);

      // Refetch questions
      const questionsResult = await certificationApi.quizzes.questions.list(currentQuizId);
      if (questionsResult.data) {
        const questionsWithAnswers = await Promise.all(
          questionsResult.data.map(async (question) => {
            const answersResult = await certificationApi.quizzes.questions.answers.list(
              currentQuizId,
              question.id
            );
            return {
              ...question,
              answers: answersResult.data || [],
            };
          })
        );
        questionsWithAnswers.sort((a, b) => a.orderIndex - b.orderIndex);
        setQuestions(questionsWithAnswers);
      }
    } catch (err) {
      console.error("Failed to save quiz question:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save quiz question"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (question: QuizQuestionWithAnswers) => {
    if (!confirm("Are you sure you want to delete this quiz question?")) return;

    if (!quizId) return;

    try {
      const deleteResult = await certificationApi.quizzes.questions.delete(
        quizId,
        question.id
      );

      if (deleteResult.error) {
        throw new Error(deleteResult.error.message || "Failed to delete question");
      }

      toast.success("Quiz question deleted successfully");

      // Close the dialog
      setIsDialogOpen(false);
      setHasUnsavedChanges(false);
      setIsNewQuestion(false);
      setSelectedQuestion(null);

      // Refetch questions
      const questionsResult = await certificationApi.quizzes.questions.list(quizId);
      if (questionsResult.data) {
        const questionsWithAnswers = await Promise.all(
          questionsResult.data.map(async (q) => {
            const answersResult = await certificationApi.quizzes.questions.answers.list(
              quizId,
              q.id
            );
            return {
              ...q,
              answers: answersResult.data || [],
            };
          })
        );
        questionsWithAnswers.sort((a, b) => a.orderIndex - b.orderIndex);
        setQuestions(questionsWithAnswers);
      }
    } catch (err) {
      console.error("Failed to delete quiz question:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete quiz question"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topic Header */}
      {topic && (
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" />
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => {
                // Navigate back to topic selection page
                const currentPath = window.location.pathname;
                const topicPath = currentPath.replace('/quiz', '');
                router.push(topicPath);
              }}
            >
              <h1 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">
                {topic.title}
              </h1>
            </div>
            {questions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {questions.length} {questions.length === 1 ? "question" : "questions"}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditQuizSettingsDrawerOpen(true)}
            disabled={!quizId}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Quiz Settings
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleAddQuiz} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Quiz Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No quiz questions yet. Add your first quiz question to get started.
              </p>
              <Button onClick={handleAddQuiz} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Quiz Question
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((question) => {
            const questionText = question.questionText || "Untitled Question";
            const questionUrls = (question as any).questionUrls || null;
            const answerCount = question.answers?.length || 0;

            return (
              <Card
                key={question.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleQuestionClick(question)}
              >
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2">
                    {renderQuestionWithUrls(questionText, questionUrls)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-xs">
                    {answerCount} {answerCount === 1 ? "answer" : "answers"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Quiz Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isNewQuestion ? "Add Quiz Question" : "Edit Quiz Question"}
            </DialogTitle>
            <DialogDescription>
              {isNewQuestion
                ? "Create a new quiz question with multiple choice answers."
                : "Edit the quiz question and answers."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <QuizSlideEditor
              quizData={editedQuizData}
              onChange={(quizData) => {
                setEditedQuizData(quizData);
                setHasUnsavedChanges(true);
              }}
            />
          </div>

          <DialogFooter className="flex justify-between">
            {!isNewQuestion && selectedQuestion && (
              <Button
                variant="destructive"
                onClick={() => handleDelete(selectedQuestion)}
                disabled={isSaving}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setHasUnsavedChanges(false);
                  setIsNewQuestion(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!editedQuizData || isSaving || !hasUnsavedChanges}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quiz Settings Drawer */}
      {quizId && (
        <EditQuizSettingsDrawer
          open={isEditQuizSettingsDrawerOpen}
          onOpenChange={setIsEditQuizSettingsDrawerOpen}
          topicId={topicId}
          quizId={quizId}
          onUpdated={() => {
            // Reload questions after quiz settings update
            const reloadQuestions = async () => {
              if (!quizId) return;
              const questionsResult = await certificationApi.quizzes.questions.list(quizId);
              if (questionsResult.data) {
                const questionsWithAnswers = await Promise.all(
                  questionsResult.data.map(async (question) => {
                    const answersResult = await certificationApi.quizzes.questions.answers.list(
                      quizId,
                      question.id
                    );
                    return {
                      ...question,
                      answers: answersResult.data || [],
                    };
                  })
                );
                questionsWithAnswers.sort((a, b) => a.orderIndex - b.orderIndex);
                setQuestions(questionsWithAnswers);
              }
            };
            reloadQuestions();
          }}
        />
      )}
    </div>
  );
}
