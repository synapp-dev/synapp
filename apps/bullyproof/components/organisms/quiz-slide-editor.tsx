"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
import { Plus, Trash2, CheckCircle2, Circle, Edit } from "lucide-react";
import { extractUrlTags } from "@/utils/parse-question-urls";
// Generate unique ID for answers
const generateId = () =>
  `answer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export type QuizData = {
  question: string;
  answers: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  questionUrls?: Record<string, string> | null;
};

interface QuizSlideEditorProps {
  quizData: QuizData | null;
  onChange: (quizData: QuizData | null) => void;
}

export function QuizSlideEditor({ quizData, onChange }: QuizSlideEditorProps) {
  const [question, setQuestion] = useState(quizData?.question || "");
  const [answers, setAnswers] = useState<
    Array<{ id: string; text: string; isCorrect: boolean }>
  >(
    quizData?.answers || [
      { id: generateId(), text: "", isCorrect: false },
      { id: generateId(), text: "", isCorrect: false },
    ]
  );
  const [questionUrls, setQuestionUrls] = useState<Record<string, string>>(
    quizData?.questionUrls || {}
  );
  const [showAnswersDialog, setShowAnswersDialog] = useState(false);
  const [tempAnswers, setTempAnswers] = useState<
    Array<{ id: string; text: string; isCorrect: boolean }>
  >([]);

  // Use ref to store onChange to avoid including it in dependencies
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Track if we're updating internally to prevent infinite loops
  const isInternalUpdateRef = useRef(false);

  // Sync internal state when quizData prop changes (e.g., when type changes to quiz)
  useEffect(() => {
    // Skip if this update came from our own onChange to prevent infinite loops
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (quizData) {
      // Only update if the content is actually different to avoid unnecessary re-renders
      const currentQuestion = question;
      const currentAnswers = answers;
      const currentUrls = questionUrls;
      const newQuestion = quizData.question || "";
      const newAnswers =
        quizData.answers && quizData.answers.length > 0
          ? quizData.answers
          : [
              { id: generateId(), text: "", isCorrect: false },
              { id: generateId(), text: "", isCorrect: false },
            ];
      const newUrls = quizData.questionUrls || {};

      if (
        currentQuestion !== newQuestion ||
        JSON.stringify(currentAnswers) !== JSON.stringify(newAnswers) ||
        JSON.stringify(currentUrls) !== JSON.stringify(newUrls)
      ) {
        setQuestion(newQuestion);
        setAnswers(newAnswers);
        setQuestionUrls(newUrls);
      }
    } else if (question !== "" || answers.length > 0) {
      // Only reset if we're not already in empty state
      setQuestion("");
      setAnswers([
        { id: generateId(), text: "", isCorrect: false },
        { id: generateId(), text: "", isCorrect: false },
      ]);
      setQuestionUrls({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizData]);

  useEffect(() => {
    // Filter out empty answers (answers with no text)
    const validAnswers = answers.filter((a) => a.text.trim().length > 0);

    // Validate and update parent when data changes
    const hasQuestion = question.trim().length > 0;
    const hasAnswers = validAnswers.length >= 2;
    const hasCorrectAnswer = validAnswers.some((a) => a.isCorrect);

    // Mark that we're making an internal update
    isInternalUpdateRef.current = true;

    if (hasQuestion && hasAnswers && hasCorrectAnswer) {
      onChangeRef.current({
        question: question, // Keep spaces in the question - don't trim
        answers: validAnswers.map((a) => ({
          id: a.id,
          text: a.text.trim(), // Trim answers but keep question spaces
          isCorrect: a.isCorrect,
        })),
        questionUrls: Object.keys(questionUrls).length > 0 ? questionUrls : null,
      });
    } else {
      onChangeRef.current(null);
    }
  }, [question, answers, questionUrls]);

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    // Extract URL tags and update questionUrls state
    const tags = extractUrlTags(value);
    const newUrls: Record<string, string> = {};
    tags.forEach((tag) => {
      // Preserve existing URL if tag already exists
      newUrls[tag] = questionUrls[tag] || "";
    });
    // Remove URLs for tags that no longer exist
    setQuestionUrls(newUrls);
  };

  const handleUrlChange = (tagName: string, url: string) => {
    setQuestionUrls((prev) => ({
      ...prev,
      [tagName]: url,
    }));
  };

  const handleQuestionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent any parent handlers from interfering with space input
    if (e.key === " ") {
      e.stopPropagation();
      // Don't prevent default - we want the space to be typed normally
    }
  };

  const handleOpenAnswersDialog = () => {
    // Copy current answers to temp state, or initialize with default if empty
    const answersToCopy =
      answers.length > 0
        ? JSON.parse(JSON.stringify(answers))
        : [
            { id: generateId(), text: "", isCorrect: false },
            { id: generateId(), text: "", isCorrect: false },
          ];
    setTempAnswers(answersToCopy);
    setShowAnswersDialog(true);
  };

  const handleCloseAnswersDialog = () => {
    setShowAnswersDialog(false);
    // Reset temp answers
    setTempAnswers([]);
  };

  const handleConfirmAnswers = () => {
    // Update answers from temp state
    setAnswers(tempAnswers);
    setShowAnswersDialog(false);
  };

  const handleTempAnswerTextChange = (id: string, text: string) => {
    setTempAnswers((prev) =>
      prev.map((answer) => (answer.id === id ? { ...answer, text } : answer))
    );
  };

  const handleTempAnswerCorrectChange = (id: string) => {
    setTempAnswers((prev) =>
      prev.map((answer) => ({
        ...answer,
        isCorrect: answer.id === id ? true : false, // Only one correct answer
      }))
    );
  };

  const handleTempAddAnswer = () => {
    setTempAnswers((prev) => [
      ...prev,
      { id: generateId(), text: "", isCorrect: false },
    ]);
  };

  const handleTempRemoveAnswer = (id: string) => {
    const validAnswers = tempAnswers.filter((a) => a.text.trim().length > 0);
    if (validAnswers.length <= 2) {
      return;
    }
    setTempAnswers((prev) => prev.filter((answer) => answer.id !== id));
  };

  // Filter out empty answers for validation
  const validAnswers = answers.filter((a) => a.text.trim().length > 0);
  const hasCorrectAnswer = validAnswers.some((a) => a.isCorrect);
  const hasEnoughAnswers = validAnswers.length >= 2;

  // Validation for temp answers (in dialog)
  const tempValidAnswers = tempAnswers.filter((a) => a.text.trim().length > 0);
  const tempHasCorrectAnswer = tempValidAnswers.some((a) => a.isCorrect);
  const tempHasEnoughAnswers = tempValidAnswers.length >= 2;
  const tempHasReachedMaxAnswers = tempAnswers.length >= 4;

  // Extract URL tags from question text
  const urlTags = extractUrlTags(question);

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quiz-question">Question</Label>
          <Input
            id="quiz-question"
            type="text"
            value={question}
            onChange={(e) => handleQuestionChange(e.target.value)}
            onKeyDown={handleQuestionKeyDown}
            placeholder="Enter the question... Use [URL:name] for links"
            className="w-full"
          />
          {urlTags.length > 0 && (
            <div className="space-y-2 mt-2 p-3 bg-muted rounded-md">
              <Label className="text-sm font-medium">
                URL Links ({urlTags.length} {urlTags.length === 1 ? "tag" : "tags"} found)
              </Label>
              {urlTags.map((tag) => (
                <div key={tag} className="space-y-1">
                  <Label htmlFor={`url-${tag}`} className="text-xs text-muted-foreground">
                    [URL:{tag}]
                  </Label>
                  <Input
                    id={`url-${tag}`}
                    type="url"
                    value={questionUrls[tag] || ""}
                    onChange={(e) => handleUrlChange(tag, e.target.value)}
                    placeholder={`https://example.com/${tag}`}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Answer Options</Label>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenAnswersDialog}
            className="w-full justify-start"
          >
            <Edit className="h-4 w-4 mr-2" />
            {validAnswers.length > 0
              ? `Click to change answers (${validAnswers.length} answers)`
              : "Click to change answers"}
          </Button>
          {!hasCorrectAnswer && validAnswers.length > 0 && (
            <p className="text-sm text-destructive">
              Please mark at least one answer as correct
            </p>
          )}
          {!hasEnoughAnswers && (
            <p className="text-sm text-destructive">
              At least 2 answer options with text are required
            </p>
          )}
        </div>
      </div>

      {/* Answers Dialog */}
      <Dialog open={showAnswersDialog} onOpenChange={setShowAnswersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Answer Options</DialogTitle>
            <DialogDescription>
              Add, edit, and select the correct answer for this quiz question.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Answer Options</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTempAddAnswer}
                      disabled={tempHasReachedMaxAnswers}
                      className="h-8"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Answer
                    </Button>
                  </span>
                </TooltipTrigger>
                {tempHasReachedMaxAnswers && (
                  <TooltipContent>
                    <p>You've reached the maximum amount of answer options</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tempAnswers.map((answer, index) => (
                <div key={answer.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTempAnswerCorrectChange(answer.id)}
                    className="flex-shrink-0 p-1 hover:opacity-80 transition-opacity"
                    aria-label={
                      answer.isCorrect
                        ? "Mark as incorrect"
                        : "Mark as correct answer"
                    }
                  >
                    {answer.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 fill-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  <Input
                    value={answer.text}
                    onChange={(e) =>
                      handleTempAnswerTextChange(answer.id, e.target.value)
                    }
                    placeholder={`Answer option ${index + 1}`}
                    className="flex-1"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTempRemoveAnswer(answer.id)}
                    disabled={tempValidAnswers.length <= 2}
                    className="flex-shrink-0 h-8 w-8 p-0"
                    aria-label="Remove answer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {!tempHasCorrectAnswer && tempValidAnswers.length > 0 && (
              <p className="text-sm text-destructive">
                Please mark at least one answer as correct
              </p>
            )}

            {!tempHasEnoughAnswers && (
              <p className="text-sm text-destructive">
                At least 2 answer options with text are required
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAnswersDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAnswers}
              disabled={!tempHasCorrectAnswer || !tempHasEnoughAnswers}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
