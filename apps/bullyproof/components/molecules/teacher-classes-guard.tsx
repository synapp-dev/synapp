"use client";

import { useEffect, useState, useMemo } from "react";
import { useMeStore } from "@/entities/me/model/store";
import { useCurrentUser } from "@/entities/me/api/getCurrentUser";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useQuery } from "@tanstack/react-query";
import { meApi } from "@/entities/me/api/endpoints";
import { AddClassesDialog } from "./add-classes-dialog";

/**
 * TeacherClassesGuard component
 *
 * Client-side guard that checks if a teacher user should see the "Add Your Classes" dialog.
 * Shows the dialog if:
 * - User has teacher access (system:teacher-access)
 * - Classes feature is enabled (/school/classes)
 * - Welcome tutorial is completed
 * - Dashboard dialog has been dismissed
 * - User has no classes in teacher_classes table
 * - Dialog hasn't been dismissed in metadata
 */
export function TeacherClassesGuard() {
  const currentUser = useMeStore((s) => s.currentUser);
  const { isLoading } = useCurrentUser();
  const { hasAccess: isTeacher } = useFeatureAccess("system:teacher-access");
  const { hasAccess: hasClassesFeature } = useFeatureAccess("/school/classes");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check if welcome tutorial is completed
  const isWelcomeCompleted = useMemo(() => {
    if (!currentUser?.metadata) return false;
    const metadata = currentUser.metadata as any;
    return metadata?.tutorials?.welcome?.completed === true;
  }, [currentUser]);

  // Check if dashboard dialog has been dismissed
  const isDashboardDialogDismissed = useMemo(() => {
    if (!currentUser?.metadata) return false;
    const metadata = currentUser.metadata as any;
    return metadata?.dialogs?.dashboard?.dismissed === true;
  }, [currentUser]);

  // Query to check if user has teacher classes
  const { data: teacherClassesData, isLoading: isLoadingClasses } = useQuery({
    queryKey: ["teacher-classes", currentUser?.id],
    queryFn: async () => {
      const result = await meApi.teacherClasses.get();
      if (result.error) {
        throw new Error(result.error.message || "Failed to check teacher classes");
      }
      return result.data ?? { hasClasses: false };
    },
    enabled: !!currentUser && isTeacher,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    // Don't check while loading
    if (isLoading || isLoadingClasses) {
      return;
    }

    // If user is not loaded yet, wait
    if (!currentUser) {
      return;
    }

    // Only check for teachers
    if (!isTeacher) {
      return;
    }

    // Don't show dialog if Classes feature is not enabled
    if (!hasClassesFeature) {
      return;
    }

    // Don't show dialog if welcome tutorial is not completed
    if (!isWelcomeCompleted) {
      return;
    }

    // Don't show dialog if dashboard dialog hasn't been dismissed yet
    if (!isDashboardDialogDismissed) {
      return;
    }

    // Check if user has classes
    const hasClasses = teacherClassesData?.hasClasses ?? false;
    if (hasClasses) {
      return;
    }

    // Check if dialog has been dismissed
    const metadata = (currentUser.metadata as any) || {};
    const isDialogDismissed =
      metadata?.dialogs?.addClasses?.dismissed === true;

    // Show dialog if it hasn't been dismissed
    if (!isDialogDismissed) {
      setDialogOpen(true);
    }
  }, [
    currentUser,
    isLoading,
    isLoadingClasses,
    isTeacher,
    hasClassesFeature,
    isWelcomeCompleted,
    isDashboardDialogDismissed,
    teacherClassesData,
  ]);

  if (!isTeacher) {
    return null;
  }

  // Don't render dialog if Classes feature is not enabled
  if (!hasClassesFeature) {
    return null;
  }

  // Don't render dialog if welcome tutorial is not completed
  if (!isWelcomeCompleted) {
    return null;
  }

  // Don't render dialog if dashboard dialog hasn't been dismissed yet
  if (!isDashboardDialogDismissed) {
    return null;
  }

  return (
    <AddClassesDialog open={dialogOpen} onOpenChange={setDialogOpen} />
  );
}
