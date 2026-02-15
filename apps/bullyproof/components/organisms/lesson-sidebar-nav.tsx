"use client";

import { useState } from "react";
import {
  BookOpen,
  Users,
  ClipboardList,
  PlayCircle,
  MessageSquare,
  History,
  CheckCircle2,
  XCircle,
  Loader2,
  HandMetal,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@workspace/ui/components/sidebar";
import { NavMain } from "@/components/organisms/nav-main";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { lessonsKeys } from "@/entities/lessons/model/keys";
import { useLessonStatusRealtime } from "@/hooks/use-lesson-status-realtime";
import { useMeStore } from "@/entities/me/model/store";
import { useFeaturesAccess } from "@/hooks/use-features-access";
import { ACTION_FEATURES } from "@/lib/feature-keys";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { TakeOverLessonDialog } from "@/components/molecules/take-over-lesson-dialog";

interface LessonSidebarNavProps {
  schoolId: string;
  lessonId: string;
}

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  Users,
  ClipboardList,
  PlayCircle,
  MessageSquare,
  History,
  CheckCircle2,
};

const navItemsConfig = [
  {
    title: "Classes",
    url: "",
    iconName: "CheckCircle2",
    disabled: true,
    disabledMessage: "Completed",
  },
  {
    title: "Topic",
    url: "",
    iconName: "CheckCircle2",
    disabled: true,
    disabledMessage: "Completed",
  },
  {
    title: "Prepare",
    url: "/prepare",
    iconName: "ClipboardList",
  },
  {
    title: "Run Lesson",
    url: "/run-lesson",
    iconName: "PlayCircle",
  },
  {
    title: "Feedback",
    url: "/feedback",
    iconName: "MessageSquare",
  },
  {
    title: "History",
    url: "/history",
    iconName: "History",
    disabled: true,
  },
];

const CANCEL_LESSON_FEATURE_KEY = ACTION_FEATURES.CANCEL_LESSON;
const TAKE_OVER_LESSON_FEATURE_KEY = ACTION_FEATURES.TAKE_OVER_LESSON;

export function LessonSidebarNav({
  schoolId,
  lessonId,
}: LessonSidebarNavProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: lessonData, isLoading } = useLessonById(lessonId);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showTakeOverDialog, setShowTakeOverDialog] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);

  // Listen for real-time status changes to enable/disable feedback button
  useLessonStatusRealtime(lessonId);

  // Check if current user is the lesson creator
  const currentUser = useMeStore((s) => s.currentUser);
  const isLessonCreator = currentUser?.id === lessonData?.createdByUserId;
  const canRunLesson = isLessonCreator;

  // Cancel lesson: feature access + (owner OR platform admin/dev)
  const featuresAccess = useFeaturesAccess([CANCEL_LESSON_FEATURE_KEY], schoolId);
  const hasCancelFeature = featuresAccess[CANCEL_LESSON_FEATURE_KEY]?.hasAccess ?? false;
  const platformRoles = Array.isArray(currentUser?.platformRoles)
    ? currentUser.platformRoles
    : [];
  const isPlatformAdminOrDev =
    platformRoles.includes("PLATFORM_ADMIN") || platformRoles.includes("INTRADARK_DEV");
  // For feedback/completed: only admins can cancel. Owners cannot cancel once lesson is done.
  const isFeedbackOrCompleted = lessonData?.status === "feedback" || lessonData?.status === "completed";
  const canCancelLesson =
    hasCancelFeature &&
    (isFeedbackOrCompleted ? isPlatformAdminOrDev : (isLessonCreator || isPlatformAdminOrDev));

  const handleCancelLesson = async () => {
    setIsCancelling(true);
    try {
      const result = await lessonsApi.put.update(lessonId, { status: "cancelled" });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to cancel lesson");
      }
      queryClient.invalidateQueries({ queryKey: lessonsKeys.all() });
      queryClient.invalidateQueries({ queryKey: lessonsKeys.detail(lessonId) });
      toast.success("Lesson cancelled");
      setShowCancelDialog(false);
      router.push(`/schools/${schoolId}/lessons`);
    } catch (err) {
      toast.error("Failed to cancel lesson", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const isCompleted = lessonData?.status === "completed";
  const isFeedback = lessonData?.status === "feedback";
  const isPreparing = lessonData?.status === "preparing";
  const canProvideFeedback = isCompleted || isFeedback;
  const takeOverableStatuses = ["preparing", "ready", "in_progress"];
  const canShowTakeOver =
    !isLessonCreator &&
    lessonData?.status &&
    takeOverableStatuses.includes(lessonData.status);

  // Debug logging (can be removed later)
  if (process.env.NODE_ENV === "development") {
    console.log("[LessonSidebarNav] Lesson status:", {
      lessonId,
      status: lessonData?.status,
      isCompleted,
      isFeedback,
      canProvideFeedback,
      isLoading,
    });
  }

  const baseUrl = `/schools/${schoolId}/lessons/${lessonId}`;

  const navItems = navItemsConfig.map((item) => {
    // When lesson is in feedback or completed stage, mark Prepare and Run Lesson as completed
    const isLessonFinished = isFeedback || isCompleted;
    const shouldMarkAsCompleted =
      isLessonFinished && (item.title === "Prepare" || item.title === "Run Lesson");

    return {
      title: item.title,
      url: item.url ? `${baseUrl}${item.url}` : baseUrl,
      // Use CheckCircle2 icon for completed items
      icon: shouldMarkAsCompleted ? CheckCircle2 : iconMap[item.iconName],
      exact: (item as { exact?: boolean }).exact ?? false,
      // Disable Run Lesson if user is not the lesson creator or lesson is still preparing
      // Enable feedback button if lesson is feedback or completed
      // Lock Prepare and Run Lesson when in feedback/completed stage
      disabled:
        item.disabled ||
        shouldMarkAsCompleted ||
        (item.title === "Prepare" && !isLessonCreator && canShowTakeOver) ||
        (item.title === "Run Lesson" && !canRunLesson) ||
        (item.title === "Run Lesson" && isPreparing) ||
        (item.title === "Feedback" && (!canProvideFeedback || !isLessonCreator)),
      // Show appropriate disabled messages
      disabledMessage:
        item.disabledMessage ||
        (shouldMarkAsCompleted
          ? "Completed"
          : item.title === "Prepare" && !isLessonCreator && canShowTakeOver
            ? "Take over to prepare"
            : item.title === "Run Lesson" && isPreparing
              ? "Complete preparation first"
              : item.title === "Run Lesson" && !canRunLesson
                ? "Take over to run"
                : item.title === "Feedback" && (!canProvideFeedback || !isLessonCreator)
                  ? "Locked"
                  : item.disabled
                    ? "Under Construction"
                    : undefined),
    };
  });

  const handleTakeOver = async () => {
    setIsTakingOver(true);
    try {
      const result = await lessonsApi.post.takeOver(lessonId);
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to take over lesson");
      }
      queryClient.invalidateQueries({ queryKey: lessonsKeys.all() });
      queryClient.invalidateQueries({ queryKey: lessonsKeys.detail(lessonId) });
      toast.success("You have taken over this lesson");
      setShowTakeOverDialog(false);
    } catch (err) {
      toast.error("Failed to take over lesson", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsTakingOver(false);
    }
  };

  return (
    <>
      <NavMain items={navItems} />
      {(canCancelLesson || canShowTakeOver) && (
        <div className="mt-2 pt-4 border-t px-2">
          <SidebarMenu>
            {canCancelLesson && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Cancel Lesson"
                  className="group text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="h-4 w-4 group-hover:animate-shake-twice" />
                  <span className="group-hover:font-medium">Cancel Lesson</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {canShowTakeOver && (
              <FeatureGuard
                feature={TAKE_OVER_LESSON_FEATURE_KEY}
                schoolId={schoolId}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Take Over"
                    onClick={() => setShowTakeOverDialog(true)}
                  >
                    <HandMetal className="h-4 w-4" />
                    <span className="group-hover:font-medium">Take Over</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </FeatureGuard>
            )}
          </SidebarMenu>
          <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Lesson</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this lesson? The lesson will be marked as cancelled and removed from active lists, but the data will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel  disabled={isCancelling}>Keep Lesson</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelLesson}
                disabled={isCancelling}
                className="bg-destructive text-secondary hover:bg-destructive/90"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel Lesson"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <TakeOverLessonDialog
          open={showTakeOverDialog}
          onOpenChange={setShowTakeOverDialog}
          lesson={
            lessonData
              ? {
                  id: lessonId,
                  assignedClasses: lessonData.assignedClasses,
                  teacher: lessonData.teacher,
                  createdByUserId: lessonData.createdByUserId,
                }
              : { id: lessonId }
          }
          onConfirm={handleTakeOver}
          isTakingOver={isTakingOver}
        />
        </div>
      )}
    </>
  );
}
