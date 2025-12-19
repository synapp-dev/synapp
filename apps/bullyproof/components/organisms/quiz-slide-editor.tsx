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
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
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
      const newQuestion = quizData.question || "";
      const newAnswers =
        quizData.answers && quizData.answers.length > 0
          ? quizData.answers
          : [
              { id: generateId(), text: "", isCorrect: false },
              { id: generateId(), text: "", isCorrect: false },
            ];

      if (
        currentQuestion !== newQuestion ||
        JSON.stringify(currentAnswers) !== JSON.stringify(newAnswers)
      ) {
        setQuestion(newQuestion);
        setAnswers(newAnswers);
      }
    } else if (question !== "" || answers.length > 0) {
      // Only reset if we're not already in empty state
      setQuestion("");
      setAnswers([
        { id: generateId(), text: "", isCorrect: false },
        { id: generateId(), text: "", isCorrect: false },
      ]);
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
      });
    } else {
      onChangeRef.current(null);
    }
  }, [question, answers]);

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
  };

  const handleQuestionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent any parent handlers from interfering with space input
    if (e.key === " ") {
      e.stopPropagation();
      // Don't prevent default - we want the space to be typed normally
    }
  };

  const handleAnswerTextChange = (id: string, text: string) => {
    setAnswers((prev) =>
      prev.map((answer) => (answer.id === id ? { ...answer, text } : answer))
    );
  };

  const handleAnswerCorrectChange = (id: string) => {
    setAnswers((prev) =>
      prev.map((answer) => ({
        ...answer,
        isCorrect: answer.id === id ? true : false, // Only one correct answer
      }))
    );
  };

  const handleAddAnswer = () => {
    setAnswers((prev) => [
      ...prev,
      { id: generateId(), text: "", isCorrect: false },
    ]);
  };

  const handleRemoveAnswer = (id: string) => {
    // Filter out empty answers to check how many valid answers exist
    const validAnswers = answers.filter((a) => a.text.trim().length > 0);
    if (validAnswers.length <= 2) {
      // Keep at least 2 valid (non-empty) answers
      return;
    }
    setAnswers((prev) => prev.filter((answer) => answer.id !== id));
  };

  // Filter out empty answers for validation
  const validAnswers = answers.filter((a) => a.text.trim().length > 0);
  const hasCorrectAnswer = validAnswers.some((a) => a.isCorrect);
  const hasEnoughAnswers = validAnswers.length >= 2;
  const hasReachedMaxAnswers = answers.length >= 4;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="quiz-question">Question</Label>
        <Input
          id="quiz-question"
          type="text"
          value={question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          onKeyDown={handleQuestionKeyDown}
          placeholder="Enter the question..."
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Answer Options</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAnswer}
                  disabled={hasReachedMaxAnswers}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Answer
                </Button>
              </span>
            </TooltipTrigger>
            {hasReachedMaxAnswers && (
              <TooltipContent>
                <p>You've reached the maximum amount of answer options</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        <div className="space-y-2">
          {answers.map((answer, index) => (
            <div
              key={answer.id}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => handleAnswerCorrectChange(answer.id)}
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
                  handleAnswerTextChange(answer.id, e.target.value)
                }
                placeholder={`Answer option ${index + 1}`}
                className="flex-1"
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveAnswer(answer.id)}
                disabled={validAnswers.length <= 2}
                className="flex-shrink-0 h-8 w-8 p-0"
                aria-label="Remove answer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

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
  );
}
