"use client";

import { FileText, Pencil, Loader2, Check, Save } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";

import type { CertificationTopic, LessonPlan, Topic } from "./types";

// Topic Header: title (opens edit drawer), badges, lesson plans + save buttons
export function TopicHeader({
  topic,
  stage,
  isCertification,
  lessonPlans,
  hasUnsavedChanges,
  isSaving,
  showSaveSuccess,
  setIsEditTopicDrawerOpen,
  setIsEditCurriculumTopicDrawerOpen,
  setShowLessonPlanDialog,
  handleBulkSave,
}: {
  topic: Topic | CertificationTopic;
  stage: any | null;
  isCertification: boolean;
  lessonPlans: LessonPlan[];
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  showSaveSuccess: boolean;
  setIsEditTopicDrawerOpen: (open: boolean) => void;
  setIsEditCurriculumTopicDrawerOpen: (open: boolean) => void;
  setShowLessonPlanDialog: (open: boolean) => void;
  handleBulkSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className=" flex items-center justify-start gap-8">
        <div className="flex items-center gap-2">
          <FileText className="text-primary" />
          {isCertification ? (
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setIsEditTopicDrawerOpen(true)}
            >
              <h1 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">
                {topic.title}
              </h1>
              <Pencil className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          ) : (
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setIsEditCurriculumTopicDrawerOpen(true)}
            >
              <h1 className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">
                {topic.title}
              </h1>
              <Pencil className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stage && <Badge variant="secondary">{stage.name}</Badge>}
          {(isCertification
            ? (topic as CertificationTopic).courseOrder !== null
            : (topic as Topic).stageOrder !== null) && (
            <Badge variant="outline">
              Topic{" "}
              {isCertification
                ? (topic as CertificationTopic).courseOrder! - 1
                : (topic as Topic).stageOrder}
            </Badge>
          )}
          {topic.status && (
            <Badge
              className="capitalize"
              variant={
                topic.status === "published"
                  ? "default"
                  : topic.status === "draft"
                    ? "secondary"
                    : "outline"
              }
            >
              {topic.status}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => setShowLessonPlanDialog(true)}
              className="relative"
            >
              <FileText className="h-4 w-4" />
              Lesson Plans
              {lessonPlans.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs"
                >
                  {lessonPlans.length}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Manage lesson plans for this topic</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block">
              <Button
                variant={
                  showSaveSuccess
                    ? "default"
                    : hasUnsavedChanges
                      ? "default"
                      : "outline"
                }
                onClick={handleBulkSave}
                disabled={
                  isSaving || (!hasUnsavedChanges && !showSaveSuccess)
                }
                className={
                  showSaveSuccess
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : hasUnsavedChanges
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : ""
                }
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : showSaveSuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TooltipTrigger>
          {!hasUnsavedChanges && !showSaveSuccess && !isSaving && (
            <TooltipContent side="left">
              <p>No changes to save</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </div>
  );
}
