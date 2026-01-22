"use client";

import { QuestionDefinition, QuestionAnswer } from "@/types/course-ratings";
import { QuestionTextInput } from "./question-text-input";
import { QuestionRatingInput } from "./question-rating-input";
import { QuestionMultipleChoice } from "./question-multiple-choice";

interface QuestionRendererProps {
  question: QuestionDefinition;
  value: string | number | string[] | null;
  onChange: (value: string | number | string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
  className,
}: QuestionRendererProps) {
  const handleChange = (newValue: string | number | string[]) => {
    onChange(newValue);
  };

  switch (question.type) {
    case "text":
      return (
        <QuestionTextInput
          id={question.id}
          label={question.label}
          value={(value as string) || ""}
          onChange={(val) => handleChange(val)}
          required={question.required}
          disabled={disabled}
          multiline={true}
          className={className}
        />
      );

    case "rating":
      return (
        <QuestionRatingInput
          id={question.id}
          label={question.label}
          value={(value as number) || null}
          onChange={(val) => handleChange(val)}
          min={question.min ?? 1}
          max={question.max ?? 5}
          required={question.required}
          disabled={disabled}
          className={className}
        />
      );

    case "multiple_choice":
      return (
        <QuestionMultipleChoice
          id={question.id}
          label={question.label}
          value={(value as string | string[]) || ""}
          onChange={(val) => handleChange(val)}
          options={question.options || []}
          allowMultiple={false}
          required={question.required}
          disabled={disabled}
          className={className}
        />
      );

    default:
      return null;
  }
}
