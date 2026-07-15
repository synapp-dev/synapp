"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, FileText, Upload, ExternalLink, Trash2 } from "lucide-react";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";

import type { CertificationTopic, LessonPlan, Topic } from "./types";

// Lesson Plan Dialog (owns upload/delete state; list state lives in the parent
// because the header badge reads lessonPlans.length)
export function LessonPlansDialog({
  showLessonPlanDialog,
  setShowLessonPlanDialog,
  topic,
  lessonPlans,
  isLoadingLessonPlans,
  fetchLessonPlans,
}: {
  showLessonPlanDialog: boolean;
  setShowLessonPlanDialog: (open: boolean) => void;
  topic: Topic | CertificationTopic | null;
  lessonPlans: LessonPlan[];
  isLoadingLessonPlans: boolean;
  fetchLessonPlans: () => Promise<void>;
}) {
  const [isUploadingLessonPlan, setIsUploadingLessonPlan] = useState(false);
  const [isDeletingLessonPlan, setIsDeletingLessonPlan] = useState<
    string | null
  >(null);
  const lessonPlanFileInputRef = useRef<HTMLInputElement>(null);

  // ── Lesson Plan handlers ──────────────────────────────────────────
  const handleLessonPlanUpload = async (file: File) => {
    if (!topic?.id) return;
    setIsUploadingLessonPlan(true);
    try {
      const result = await topicsApi.lessonPlans.upload(topic.id, file);
      if (result.data) {
        toast.success("Lesson plan uploaded", {
          description: file.name,
        });
        await fetchLessonPlans();
      } else {
        toast.error("Upload failed", {
          description: result.error?.message ?? "Unknown error",
        });
      }
    } catch (err: any) {
      toast.error("Upload failed", {
        description: err.message ?? "Unknown error",
      });
    } finally {
      setIsUploadingLessonPlan(false);
      if (lessonPlanFileInputRef.current) {
        lessonPlanFileInputRef.current.value = "";
      }
    }
  };

  const handleLessonPlanDownload = async (planId: string) => {
    try {
      const result = await topicsApi.lessonPlans.getUrl(planId);
      if (result.data?.url) {
        window.open(result.data.url, "_blank");
      } else {
        toast.error("Failed to get download link");
      }
    } catch (err: any) {
      toast.error("Failed to get download link", {
        description: err.message ?? "Unknown error",
      });
    }
  };

  const handleLessonPlanDelete = async (planId: string, fileName: string) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setIsDeletingLessonPlan(planId);
    try {
      const result = await topicsApi.lessonPlans.delete(planId);
      if (result.data?.success) {
        toast.success("Lesson plan deleted", { description: fileName });
        await fetchLessonPlans();
      } else {
        toast.error("Delete failed", {
          description: result.error?.message ?? "Unknown error",
        });
      }
    } catch (err: any) {
      toast.error("Delete failed", {
        description: err.message ?? "Unknown error",
      });
    } finally {
      setIsDeletingLessonPlan(null);
    }
  };

  return (
    <Dialog
      open={showLessonPlanDialog}
      onOpenChange={setShowLessonPlanDialog}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lesson Plans</DialogTitle>
          <DialogDescription>
            Manage lesson plan PDFs for {topic?.title || "this topic"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Upload area */}
          <div className="flex items-center gap-3">
            <input
              ref={lessonPlanFileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLessonPlanUpload(file);
              }}
            />
            <Button
              variant="outline"
              onClick={() => lessonPlanFileInputRef.current?.click()}
              disabled={isUploadingLessonPlan}
            >
              {isUploadingLessonPlan ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploadingLessonPlan ? "Uploading..." : "Upload PDF"}
            </Button>
            <p className="text-muted-foreground text-sm">PDF files only</p>
          </div>

          {/* Plans list */}
          {isLoadingLessonPlans ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : lessonPlans.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed py-8 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No lesson plans uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lessonPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {plan.fileName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {plan.fileSize
                          ? `${(plan.fileSize / 1024).toFixed(0)} KB`
                          : "Unknown size"}
                        {" · "}
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleLessonPlanDownload(plan.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open PDF</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() =>
                            handleLessonPlanDelete(plan.id, plan.fileName)
                          }
                          disabled={isDeletingLessonPlan === plan.id}
                        >
                          {isDeletingLessonPlan === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete lesson plan</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowLessonPlanDialog(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
