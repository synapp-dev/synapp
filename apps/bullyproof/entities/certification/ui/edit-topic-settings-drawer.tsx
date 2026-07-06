"use client";

import type { CourseTopicRow } from "@/types/db";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { certificationApi } from "@/entities/certification/api/endpoints";

type Topic = CourseTopicRow;

interface EditTopicSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: Topic;
  onTopicUpdated?: () => void;
  onTopicDeleted?: () => void;
}

export function EditTopicSettingsDrawer({
  open,
  onOpenChange,
  topic,
  onTopicUpdated,
  onTopicDeleted,
}: EditTopicSettingsDrawerProps) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [isSequential, setIsSequential] = useState(true);
  const [quizCompletionPercentage, setQuizCompletionPercentage] = useState(100);
  const [officialNotes, setOfficialNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Load topic data when drawer opens
  useEffect(() => {
    if (open && topic) {
      setTitle(topic.title || "");
      setStatus((topic.status as "draft" | "published" | "archived") || "draft");
      setIsSequential(topic.isSequential ?? true);
      setQuizCompletionPercentage(topic.quizCompletionPercentage ?? 100);
      setOfficialNotes(topic.officialNotes || "");
      setError(null);
    }
  }, [open, topic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (quizCompletionPercentage < 0 || quizCompletionPercentage > 100) {
      setError("Quiz completion percentage must be between 0 and 100");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await certificationApi.topics.update(topic.id, {
        title: title.trim(),
        status,
        isSequential,
        quizCompletionPercentage,
        officialNotes: officialNotes.trim() || null,
      });

      if (result.error) {
        setError(result.error.message || "Failed to update topic");
        return;
      }

      // Success - close drawer and refresh
      toast.success("Topic settings saved successfully");
      onOpenChange(false);
      onTopicUpdated?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update topic";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await certificationApi.topics.delete(topic.id);

      if (result.error) {
        setError(result.error.message || "Failed to delete topic");
        setShowDeleteDialog(false);
        return;
      }

      // Success - close drawer and refresh
      toast.success("Topic deleted successfully");
      setShowDeleteDialog(false);
      onOpenChange(false);
      onTopicDeleted?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete topic";
      setError(errorMessage);
      toast.error(errorMessage);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isDeleting) {
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="top"
          className="max-w-2xl mx-auto rounded-b-lg shadow-lg border-t border-x border-b p-6 max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader className="mb-6 p-0">
            <SheetTitle>Edit Topic Settings</SheetTitle>
            <SheetDescription>
              Configure topic-level settings including quiz requirements and completion criteria.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter topic title"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value: "draft" | "published" | "archived") =>
                    setStatus(value)
                  }
                  disabled={isSubmitting}
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

              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isSequential">Sequential Completion</Label>
                  <p className="text-sm text-muted-foreground">
                    Quizzes must be completed in order
                  </p>
                </div>
                <Switch
                  id="isSequential"
                  checked={isSequential}
                  onCheckedChange={setIsSequential}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quizCompletionPercentage">
                  Quiz Completion Percentage
                </Label>
                <p className="text-sm text-muted-foreground">
                  Minimum percentage required to complete this topic (0-100)
                </p>
                <Input
                  id="quizCompletionPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={quizCompletionPercentage}
                  onChange={(e) =>
                    setQuizCompletionPercentage(parseInt(e.target.value) || 0)
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="officialNotes">Official Notes</Label>
                <p className="text-sm text-muted-foreground">
                  Topic-level notes and instructions
                </p>
                <Textarea
                  id="officialNotes"
                  value={officialNotes}
                  onChange={(e) => setOfficialNotes(e.target.value)}
                  placeholder="Enter official notes (optional)"
                  disabled={isSubmitting}
                  rows={4}
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isSubmitting || isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Topic
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isSubmitting || isDeleting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || isDeleting}>
                  {isSubmitting ? (
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
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the topic "{topic.title}". This action
              cannot be undone. All slides and quizzes associated with this topic
              will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
