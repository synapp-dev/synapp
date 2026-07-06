"use client";

import type { CourseTopicQuizRow } from "@/types/db";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { certificationApi } from "@/entities/certification/api/endpoints";

type Quiz = CourseTopicQuizRow;

interface EditQuizSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  quizId: string | null;
  onUpdated?: () => void;
}

export function EditQuizSettingsDrawer({
  open,
  onOpenChange,
  topicId,
  quizId,
  onUpdated,
}: EditQuizSettingsDrawerProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz-level fields
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [passingScorePercentage, setPassingScorePercentage] = useState(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [isRequired, setIsRequired] = useState(true);
  const [sequenceType, setSequenceType] = useState<"sequential" | "user_choice">("sequential");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");

  // Load data when drawer opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, topicId, quizId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch quiz data if quizId exists
      if (quizId) {
        const quizResult = await certificationApi.quizzes.byId(quizId);
        if (quizResult.data) {
          setQuiz(quizResult.data);
          setQuizTitle(quizResult.data.title || "");
          setQuizDescription(quizResult.data.description || "");
          setPassingScorePercentage(quizResult.data.passingScorePercentage ?? 70);
          setTimeLimitMinutes(quizResult.data.timeLimitMinutes ?? null);
          setMaxAttempts(quizResult.data.maxAttempts ?? null);
          setIsRequired(quizResult.data.isRequired ?? true);
          setSequenceType((quizResult.data.sequenceType || "sequential") as "sequential" | "user_choice");
          setStatus((quizResult.data.status || "draft") as "draft" | "published" | "archived");
        } else {
          setError(quizResult.error?.message || "Failed to load quiz");
        }
      } else {
        setError("No quiz found. Please create a quiz first.");
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!quizId || !quiz) {
      setError("No quiz found. Please create a quiz first.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Update quiz-level settings
      const quizUpdateResult = await certificationApi.quizzes.update(quizId, {
        title: quizTitle.trim() || "Topic Quiz",
        description: quizDescription.trim() || null,
        passingScorePercentage,
        timeLimitMinutes: timeLimitMinutes || null,
        maxAttempts: maxAttempts || null,
        isRequired,
        sequenceType,
        status,
      });

      if (quizUpdateResult.error) {
        throw new Error(quizUpdateResult.error.message || "Failed to update quiz settings");
      }

      toast.success("Quiz settings saved successfully");
      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      console.error("Failed to save settings:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save settings";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setError(null);
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="top"
        className="max-w-2xl mx-auto rounded-b-lg shadow-lg border-t border-x border-b p-6 max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="mb-6 p-0">
          <SheetTitle>Edit Quiz Settings</SheetTitle>
          <SheetDescription>
            Configure quiz-level settings including passing scores, time limits, and attempt limits.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quiz-Level Settings */}
            {quizId && quiz ? (
              <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quizTitle">
                      Quiz Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="quizTitle"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="Enter quiz title"
                      disabled={isSaving}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quizDescription">Description</Label>
                    <Textarea
                      id="quizDescription"
                      value={quizDescription}
                      onChange={(e) => setQuizDescription(e.target.value)}
                      placeholder="Enter quiz description (optional)"
                      disabled={isSaving}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passingScorePercentage">
                      Passing Score Percentage
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Minimum score required to pass this quiz (0-100)
                    </p>
                    <Input
                      id="passingScorePercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={passingScorePercentage}
                      onChange={(e) =>
                        setPassingScorePercentage(parseInt(e.target.value) || 0)
                      }
                      disabled={isSaving}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeLimitMinutes">Time Limit (minutes)</Label>
                      <p className="text-sm text-muted-foreground">
                        Leave empty for no time limit
                      </p>
                      <Input
                        id="timeLimitMinutes"
                        type="number"
                        min="1"
                        value={timeLimitMinutes || ""}
                        onChange={(e) =>
                          setTimeLimitMinutes(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        placeholder="No limit"
                        disabled={isSaving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxAttempts">Max Attempts</Label>
                      <p className="text-sm text-muted-foreground">
                        Leave empty for unlimited attempts
                      </p>
                      <Input
                        id="maxAttempts"
                        type="number"
                        min="1"
                        value={maxAttempts || ""}
                        onChange={(e) =>
                          setMaxAttempts(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        placeholder="Unlimited"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="isRequired">Required</Label>
                      <p className="text-sm text-muted-foreground">
                        Quiz must be completed to progress
                      </p>
                    </div>
                    <Switch
                      id="isRequired"
                      checked={isRequired}
                      onCheckedChange={setIsRequired}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sequenceType">Sequence Type</Label>
                    <Select
                      value={sequenceType}
                      onValueChange={(value: "sequential" | "user_choice") =>
                        setSequenceType(value)
                      }
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select sequence type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">Sequential</SelectItem>
                        <SelectItem value="user_choice">User Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(value: "draft" | "published" | "archived") =>
                        setStatus(value)
                      }
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No quiz found. Please create a quiz first by adding quiz questions.
                </p>
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
