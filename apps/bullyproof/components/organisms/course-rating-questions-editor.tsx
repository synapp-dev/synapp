"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { QuestionDefinition } from "@/types/course-ratings";
import { QuestionRenderer } from "@/components/molecules/question-renderer";
import { cn } from "@workspace/ui/lib/utils";

interface CourseRatingQuestionsEditorProps {
  questions: QuestionDefinition[];
  onChange: (questions: QuestionDefinition[]) => void;
  className?: string;
}

export function CourseRatingQuestionsEditor({
  questions,
  onChange,
  className,
}: CourseRatingQuestionsEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<QuestionDefinition> | null>(null);

  const generateQuestionId = () => {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleAddQuestion = () => {
    const newQuestion: QuestionDefinition = {
      id: generateQuestionId(),
      type: "text",
      label: "",
      required: false,
    };
    onChange([...questions, newQuestion]);
    setEditingIndex(questions.length);
    setEditingQuestion(newQuestion);
  };

  const handleEditQuestion = (index: number) => {
    setEditingIndex(index);
    setEditingQuestion({ ...questions[index] });
  };

  const handleSaveQuestion = () => {
    if (!editingQuestion || editingIndex === null) return;

    // Validate question
    if (!editingQuestion.label?.trim()) {
      return;
    }

    // Validate options for multiple_choice
    if (editingQuestion.type === "multiple_choice") {
      if (!editingQuestion.options || editingQuestion.options.length === 0) {
        return;
      }
    }

    const updatedQuestions = [...questions];
    updatedQuestions[editingIndex] = editingQuestion as QuestionDefinition;
    onChange(updatedQuestions);
    setEditingIndex(null);
    setEditingQuestion(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    onChange(updatedQuestions);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingQuestion(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleQuestionFieldChange = (field: keyof QuestionDefinition, value: any) => {
    if (!editingQuestion) return;

    const updated: Partial<QuestionDefinition> = {
      ...editingQuestion,
      [field]: value,
    };

    // Reset type-specific fields when type changes
    if (field === "type") {
      if (value === "multiple_choice") {
        updated.options = updated.options || [""];
      } else {
        delete updated.options;
      }
      if (value === "rating") {
        updated.min = updated.min ?? 1;
        updated.max = updated.max ?? 5;
      } else {
        delete updated.min;
        delete updated.max;
      }
    }

    setEditingQuestion(updated);
  };

  const handleAddOption = () => {
    if (!editingQuestion || editingQuestion.type !== "multiple_choice") return;
    const options = editingQuestion.options || [];
    handleQuestionFieldChange("options", [...options, ""]);
  };

  const handleUpdateOption = (optionIndex: number, value: string) => {
    if (!editingQuestion || editingQuestion.type !== "multiple_choice") return;
    const options = [...(editingQuestion.options || [])];
    options[optionIndex] = value;
    handleQuestionFieldChange("options", options);
  };

  const handleRemoveOption = (optionIndex: number) => {
    if (!editingQuestion || editingQuestion.type !== "multiple_choice") return;
    const options = editingQuestion.options || [];
    if (options.length <= 1) return; // Keep at least one option
    handleQuestionFieldChange(
      "options",
      options.filter((_, i) => i !== optionIndex)
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rating Questions</h3>
          <p className="text-sm text-muted-foreground">
            Questions shown to users when they complete this course
          </p>
        </div>
        <Button type="button" onClick={handleAddQuestion} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No questions configured. Click "Add Question" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    Question {index + 1}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {editingIndex === index ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveQuestion}
                          disabled={
                            !editingQuestion?.label?.trim() ||
                            (editingQuestion.type === "multiple_choice" &&
                              (!editingQuestion.options ||
                                editingQuestion.options.length === 0 ||
                                editingQuestion.options.some((opt) => !opt.trim())))
                          }
                        >
                          Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditQuestion(index)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingIndex === index && editingQuestion ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>
                        Question Type <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={editingQuestion.type || "text"}
                        onValueChange={(value: "text" | "rating" | "multiple_choice") =>
                          handleQuestionFieldChange("type", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="rating">Rating</SelectItem>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Question Label <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={editingQuestion.label || ""}
                        onChange={(e) => handleQuestionFieldChange("label", e.target.value)}
                        placeholder="Enter question text"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingQuestion.required ?? false}
                        onCheckedChange={(checked) =>
                          handleQuestionFieldChange("required", checked)
                        }
                      />
                      <Label>Required</Label>
                    </div>

                    {editingQuestion.type === "rating" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Minimum</Label>
                          <Input
                            type="number"
                            value={editingQuestion.min ?? 1}
                            onChange={(e) =>
                              handleQuestionFieldChange("min", parseInt(e.target.value) || 1)
                            }
                            min={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Maximum</Label>
                          <Input
                            type="number"
                            value={editingQuestion.max ?? 5}
                            onChange={(e) =>
                              handleQuestionFieldChange("max", parseInt(e.target.value) || 5)
                            }
                            min={1}
                          />
                        </div>
                      </div>
                    )}

                    {editingQuestion.type === "multiple_choice" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Options</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddOption}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(editingQuestion.options || [""]).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => handleUpdateOption(optIndex, e.target.value)}
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              {(editingQuestion.options?.length || 0) > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveOption(optIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Preview</Label>
                      <div className="p-4 border rounded-md bg-muted/50">
                        <QuestionRenderer
                          question={editingQuestion as QuestionDefinition}
                          value={
                            editingQuestion.type === "multiple_choice"
                              ? ""
                              : editingQuestion.type === "rating"
                                ? null
                                : ""
                          }
                          onChange={() => {}}
                          disabled={true}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{question.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({question.type})
                      </span>
                      {question.required && (
                        <span className="text-xs text-destructive">Required</span>
                      )}
                    </div>
                    {question.type === "rating" && (
                      <p className="text-xs text-muted-foreground">
                        Range: {question.min ?? 1} - {question.max ?? 5}
                      </p>
                    )}
                    {question.type === "multiple_choice" && question.options && (
                      <div className="text-xs text-muted-foreground">
                        Options: {question.options.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
