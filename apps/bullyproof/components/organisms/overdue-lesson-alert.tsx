"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Clock, PlayCircle, X } from "lucide-react";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { useMeStore } from "@/entities/me/model/store";
import { useSchoolStore } from "@/stores/school-store";

type LessonWithDetails = {
  id: string;
  schoolId: string;
  topicId: string;
  createdByUserId: string | null;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  topic?: {
    title?: string;
  };
  assignedClasses?: Array<{
    classId: string;
    className: string;
  }>;
};

// Format relative time (e.g., "30 minutes ago", "2 hours ago")
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const scheduledTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - scheduledTime.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
}

// LocalStorage key for dismissed lesson IDs
const DISMISSED_LESSONS_KEY = "overdue-lessons-dismissed";

function getDismissedLessonIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DISMISSED_LESSONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addDismissedLessonId(lessonId: string): void {
  if (typeof window === "undefined") return;
  try {
    const dismissed = getDismissedLessonIds();
    if (!dismissed.includes(lessonId)) {
      dismissed.push(lessonId);
      localStorage.setItem(DISMISSED_LESSONS_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function OverdueLessonAlert() {
  const router = useRouter();
  const currentUser = useMeStore((s) => s.currentUser);
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    setDismissedIds(getDismissedLessonIds());
  }, []);

  // Fetch lessons with status 'ready' for the current user (across all their schools)
  const { data: lessons } = useQuery({
    queryKey: ["lessons", "overdue-check-global", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      // Fetch user's lessons without schoolId filter to get all their lessons
      const result = await lessonsApi.get.list({
        teacherId: currentUser.id,
        status: "ready",
      });
      
      if (result.error || !result.data) return [];
      return result.data as LessonWithDetails[];
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch too often for global check
  });

  // Filter to only overdue lessons (scheduledFor is in the past and not dismissed)
  const overdueLessons = useMemo(() => {
    if (!lessons) return [];
    
    const now = new Date();
    return lessons.filter((lesson) => {
      if (!lesson.scheduledFor) return false;
      if (dismissedIds.includes(lesson.id)) return false;
      
      const scheduledDate = new Date(lesson.scheduledFor);
      return scheduledDate < now;
    });
  }, [lessons, dismissedIds]);

  // Show dialog when there are overdue lessons (only once per session)
  useEffect(() => {
    if (overdueLessons.length > 0 && !isOpen && !hasChecked) {
      setIsOpen(true);
      setCurrentLessonIndex(0);
      setHasChecked(true);
    }
  }, [overdueLessons.length, isOpen, hasChecked]);

  const currentLesson = overdueLessons[currentLessonIndex];

  if (!currentLesson) return null;

  const handleGoToLesson = () => {
    setIsOpen(false);
    // Use the school slug from the current school if it matches, otherwise use the lesson's schoolId
    const schoolSlug = currentSchool?.slug || currentLesson.schoolId;
    router.push(`/schools/${schoolSlug}/lessons/${currentLesson.id}/run-lesson`);
  };

  const handleDismiss = () => {
    addDismissedLessonId(currentLesson.id);
    setDismissedIds((prev) => [...prev, currentLesson.id]);
    
    // If there are more lessons, show the next one
    if (currentLessonIndex < overdueLessons.length - 1) {
      setCurrentLessonIndex((prev) => prev + 1);
    } else {
      setIsOpen(false);
    }
  };

  const handleRemindLater = () => {
    // Just close without dismissing - will show again on next page load
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Scheduled Lesson Overdue
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You have a scheduled lesson that was due to start{" "}
                <span className="font-medium text-foreground">
                  {formatTimeAgo(currentLesson.scheduledFor!)}
                </span>
                .
              </p>
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">
                  {currentLesson.topic?.title || "Untitled Lesson"}
                </p>
                {currentLesson.assignedClasses && currentLesson.assignedClasses.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {currentLesson.assignedClasses.map((c) => (
                      <Badge key={c.classId} variant="outline" className="text-xs">
                        {c.className}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {overdueLessons.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {currentLessonIndex + 1} of {overdueLessons.length} overdue lessons
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="sm:mr-auto"
          >
            <X className="h-4 w-4 mr-1" />
            Don't remind me
          </Button>
          <AlertDialogCancel onClick={handleRemindLater}>
            Remind Later
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleGoToLesson}>
            <PlayCircle className="h-4 w-4 mr-2" />
            Go to Lesson
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
