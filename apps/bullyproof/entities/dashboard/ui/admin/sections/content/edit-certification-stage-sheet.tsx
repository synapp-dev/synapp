"use client";

import type { CertificationCourseRow } from "@/types/db";

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
import { Loader2, Edit, Trash2 } from "lucide-react";
import { certificationApi } from "@/entities/certification/api/endpoints";

type Stage = CertificationCourseRow & {
  topicCount?: number;
};

interface EditCertificationStageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
  onStageUpdated?: () => void;
  onStageDeleted?: () => void;
}

export function EditCertificationStageSheet({
  open,
  onOpenChange,
  stage,
  onStageUpdated,
  onStageDeleted,
}: EditCertificationStageSheetProps) {
  const [name, setName] = useState("");
  const [sortIndex, setSortIndex] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Load stage data when sheet opens
  useEffect(() => {
    if (open && stage) {
      setName(stage.name || "");
      setSortIndex(stage.sortIndex?.toString() || "");
      setError(null);
    }
  }, [open, stage]);

  const validateForm = (): { isValid: boolean; message?: string } => {
    if (!name.trim()) {
      return { isValid: false, message: "Name is required" };
    }
    if (sortIndex && (isNaN(Number(sortIndex)) || Number(sortIndex) < 0 || Number(sortIndex) > 32767)) {
      return {
        isValid: false,
        message: "Sort index must be a number between 0 and 32767",
      };
    }
    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage) return;

    setError(null);

    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.message || "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await certificationApi.stages.update(stage.id, {
        name: name.trim(),
        sortIndex: sortIndex ? Number(sortIndex) : undefined,
      });

      if (result.error) {
        setError(result.error.message || "Failed to update stage");
        return;
      }

      // Success - close sheet and refresh
      onOpenChange(false);
      onStageUpdated?.();
    } catch (err) {
      console.error("Failed to update certification stage:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update certification stage. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!stage) return;

    setIsDeleting(true);
    try {
      const result = await certificationApi.stages.delete(stage.id);

      if (result.error) {
        setError(result.error.message || "Failed to delete stage");
        setShowDeleteDialog(false);
        return;
      }

      // Success - close sheet and refresh
      setShowDeleteDialog(false);
      onOpenChange(false);
      onStageDeleted?.();
    } catch (err) {
      console.error("Failed to delete certification stage:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete certification stage. Please try again."
      );
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!stage) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[95vh] w-full max-w-2xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 flex flex-col"
        >
          <div className="p-6 pb-4 border-b">
            <SheetHeader className="space-y-1">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <Edit className="h-5 w-5" />
                Edit Certification Stage Information
              </SheetTitle>
              <SheetDescription className="text-sm">
                Update the stage details below. Changes will be saved
                immediately.
              </SheetDescription>
            </SheetHeader>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 max-w-2xl mx-auto">
                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium">
                      {error}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={stage.code}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Stage code cannot be changed after creation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Certification Course, Advanced Certification"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    The display name for this certification stage
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortIndex">
                    Sort Index
                  </Label>
                  <Input
                    id="sortIndex"
                    type="number"
                    placeholder="Sort order"
                    value={sortIndex}
                    onChange={(e) => setSortIndex(e.target.value)}
                    disabled={isSubmitting}
                    min={0}
                    max={32767}
                  />
                  <p className="text-xs text-muted-foreground">
                    The sort order for this stage. Lower numbers appear first.
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isSubmitting || isDeleting}
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Stage
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Permanently delete this stage. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the certification stage &quot;{stage.name}&quot;. This action
              cannot be undone. All topics associated with this stage will also
              be affected.
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
