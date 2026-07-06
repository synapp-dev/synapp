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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
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
import { CourseRatingQuestionsEditor } from "@/components/organisms/course-rating-questions-editor";
import type { QuestionDefinition } from "@/types/course-ratings";

type Course = CertificationCourseRow & {
  topicCount?: number;
};

interface EditCertificationCourseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  onCourseUpdated?: () => void;
  onCourseDeleted?: () => void;
}

export function EditCertificationCourseSheet({
  open,
  onOpenChange,
  course,
  onCourseUpdated,
  onCourseDeleted,
}: EditCertificationCourseSheetProps) {
  const [name, setName] = useState("");
  const [sortIndex, setSortIndex] = useState<string>("");
  const [ratingQuestions, setRatingQuestions] = useState<QuestionDefinition[]>([]);
  const [activeTab, setActiveTab] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Load course data when sheet opens
  useEffect(() => {
    if (open && course) {
      setName(course.name || "");
      setSortIndex(course.sortIndex?.toString() || "");
      // Load rating questions from course data
      if (course.ratingQuestions && Array.isArray(course.ratingQuestions)) {
        setRatingQuestions(course.ratingQuestions as QuestionDefinition[]);
      } else {
        setRatingQuestions([]);
      }
      setError(null);
      setActiveTab("info");
    }
  }, [open, course]);

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
    if (!course) return;

    setError(null);

    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.message || "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        name: name.trim(),
        sortIndex: sortIndex ? Number(sortIndex) : undefined,
        ratingQuestions: ratingQuestions.length > 0 ? ratingQuestions : [],
      };
      console.log("[EditCourseSheet] Updating course with data:", updateData);
      console.log("[EditCourseSheet] Rating questions:", ratingQuestions);
      
      const result = await certificationApi.courses.update(course.id, updateData);

      if (result.error) {
        setError(result.error.message || "Failed to update course");
        return;
      }
      
      console.log("[EditCourseSheet] Update result:", result.data);

      // Success - close sheet and refresh
      onOpenChange(false);
      onCourseUpdated?.();
    } catch (err) {
      console.error("Failed to update certification course:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update certification course. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!course) return;

    setIsDeleting(true);
    try {
      const result = await certificationApi.courses.delete(course.id);

      if (result.error) {
        setError(result.error.message || "Failed to delete course");
        setShowDeleteDialog(false);
        return;
      }

      // Success - close sheet and refresh
      setShowDeleteDialog(false);
      onOpenChange(false);
      onCourseDeleted?.();
    } catch (err) {
      console.error("Failed to delete certification course:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete certification course. Please try again."
      );
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!course) {
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
                Edit Certification Course Information
              </SheetTitle>
              <SheetDescription className="text-sm">
                Update the course details below. Changes will be saved
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

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">Course Info</TabsTrigger>
                    <TabsTrigger value="questions">Rating Questions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="code">Code</Label>
                      <Input
                        id="code"
                        value={course.code}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Course code cannot be changed after creation.
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
                        The display name for this certification course
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
                        The sort order for this course. Lower numbers appear first.
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
                        Delete Course
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Permanently delete this course. This action cannot be undone.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="questions" className="mt-6">
                    <CourseRatingQuestionsEditor
                      questions={ratingQuestions}
                      onChange={setRatingQuestions}
                    />
                  </TabsContent>
                </Tabs>
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
              This will permanently delete the certification course "{course.name}". This action
              cannot be undone. All topics associated with this course will also
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
