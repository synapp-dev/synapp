/**
 * Type definitions for course rating question metadata
 */

export type QuestionType = "text" | "rating" | "multiple_choice";

export interface QuestionDefinition {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[]; // For multiple_choice
  min?: number; // For rating
  max?: number; // For rating
}

export interface QuestionAnswer {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[]; // For multiple_choice
  min?: number; // For rating
  max?: number; // For rating
  value: string | number | string[]; // User's answer
}

export interface QuestionMetadata {
  questions: QuestionAnswer[];
}

export interface CourseRatingQuestions {
  questions: QuestionDefinition[];
}
