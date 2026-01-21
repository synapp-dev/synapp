-- Migration: Add question_urls JSONB column to quiz_questions table
-- This allows storing URL mappings for [URL:name] tags in question text

-- Add the question_urls column (nullable, defaults to NULL)
ALTER TABLE quiz_questions
ADD COLUMN IF NOT EXISTS question_urls JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN quiz_questions.question_urls IS 'JSONB object mapping URL tag names to URLs. Example: {"docs": "https://example.com/docs", "guide": "https://example.com/guide"}. Used with [URL:name] tags in question_text.';
