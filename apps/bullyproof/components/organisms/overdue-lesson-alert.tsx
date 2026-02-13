"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { Badge } from "@workspace/ui/components/badge";
import { buttonVariants } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Clock, PlayCircle } from "lucide-react";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { LessonTopicThumbnail } from "@/entities/lessons/ui/lesson-card";
import { useMeStore } from "@/entities/me/model/store";
import { useMySchoolsQuery } from "@/entities/me/model/useMySchoolsQuery";

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
  schoolName?: string;
  schoolSlug?: string;
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
  const pathname = usePathname();
  const currentUser = useMeStore((s) => s.currentUser);

  const runLessonMatch = pathname?.match(/^\/schools\/[^/]+\/lessons\/([^/]+)\/run-lesson/);
  const currentLessonIdFromPath = runLessonMatch?.[1] ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);
  const [dontRemindChecked, setDontRemindChecked] = useState(false);

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    setDismissedIds(getDismissedLessonIds());
  }, []);

  // Fetch user's schools for school name and slug
  const { data: schools = [] } = useMySchoolsQuery({ limit: 50 });

  // Fetch lessons with status 'ready', filter overdue (by date), enrich with details
  const { data: overdueLessonsRaw } = useQuery({
    queryKey: ["lessons", "overdue-check-global", currentUser?.id],
    queryFn: async ({ queryKey }) => {
      const [, , userId] = queryKey as [string, string, string | undefined];
      if (!userId) return [];

      const result = await lessonsApi.get.list({
        teacherId: userId,
        status: "ready",
      });

      if (result.error || !result.data) return [];

      const now = new Date();
      const rawOverdue = result.data.filter((lesson: LessonWithDetails) => {
        if (!lesson.scheduledFor) return false;
        return new Date(lesson.scheduledFor) < now;
      });

      // Enrich each overdue lesson with topic and assignedClasses via byId
      const enriched = await Promise.all(
        rawOverdue.map(async (lesson: LessonWithDetails) => {
          const detailResult = await lessonsApi.get.byId(lesson.id);
          if (detailResult.error || !detailResult.data) {
            return { ...lesson, topic: undefined, assignedClasses: [] } as LessonWithDetails;
          }
          const detail = detailResult.data;
          return {
            ...lesson,
            topic: detail.topic,
            assignedClasses: detail.assignedClasses || [],
          } as LessonWithDetails;
        })
      );

      return enriched;
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Filter out dismissed lessons and add school name/slug from user's schools
  const overdueLessons = useMemo(() => {
    if (!overdueLessonsRaw) return [];
    return overdueLessonsRaw
      .filter((lesson: LessonWithDetails) => !dismissedIds.includes(lesson.id))
      .map((lesson: LessonWithDetails) => {
        const school = schools.find((s) => s.id === lesson.schoolId);
        return {
          ...lesson,
          schoolName: school?.name,
          schoolSlug: school?.slug,
        } as LessonWithDetails;
      });
  }, [overdueLessonsRaw, schools, dismissedIds]);

  const isOnRunLessonForOverdue = Boolean(
    currentLessonIdFromPath && overdueLessons.some((l) => l.id === currentLessonIdFromPath)
  );

  // Show dialog when there are overdue lessons (only once per session), but not when already on run-lesson for that lesson
  useEffect(() => {
    if (overdueLessons.length > 0 && !isOpen && !hasChecked && !isOnRunLessonForOverdue) {
      setIsOpen(true);
      setCurrentLessonIndex(0);
      setHasChecked(true);
    }
  }, [overdueLessons.length, isOpen, hasChecked, isOnRunLessonForOverdue]);

  // Clamp index when list shrinks (e.g. after dismissing a lesson)
  useEffect(() => {
    if (overdueLessons.length > 0 && currentLessonIndex >= overdueLessons.length) {
      setCurrentLessonIndex(0);
    }
  }, [overdueLessons.length, currentLessonIndex]);

  const currentLesson = overdueLessons[currentLessonIndex];

  if (!currentLesson) return null;

  const schoolSlug = currentLesson.schoolSlug || currentLesson.schoolId;

  const handleGoToLesson = () => {
    if (dontRemindChecked) {
      addDismissedLessonId(currentLesson.id);
      setDismissedIds((prev) => [...prev, currentLesson.id]);
    }
    setIsOpen(false);
    setDontRemindChecked(false);
    router.push(`/schools/${schoolSlug}/lessons/${currentLesson.id}/run-lesson`);
  };

  const handleRemindLater = () => {
    if (dontRemindChecked) {
      addDismissedLessonId(currentLesson.id);
      setDismissedIds((prev) => [...prev, currentLesson.id]);
      if (currentLessonIndex < overdueLessons.length - 1) {
        setCurrentLessonIndex((prev) => prev + 1);
        setDontRemindChecked(false);
        return;
      }
    }
    setDontRemindChecked(false);
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="sm:max-w-xl">
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

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex gap-3">
                  {currentLesson.topicId && (
                    <div className="w-24 aspect-video flex-shrink-0 self-start overflow-hidden rounded-md flex items-center justify-center bg-muted">
                      <LessonTopicThumbnail topicId={currentLesson.topicId} horizontal={false} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    {currentLesson.schoolName && (
                      <p className="text-xs text-muted-foreground">{currentLesson.schoolName}</p>
                    )}
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
                </div>
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
          <div className="flex items-center space-x-2 sm:mr-auto">
            <Checkbox
              id="dont-remind-overdue"
              checked={dontRemindChecked}
              onCheckedChange={(checked) => setDontRemindChecked(checked === true)}
            />
            <Label
              htmlFor="dont-remind-overdue"
              className="text-sm font-normal cursor-pointer"
            >
              Don&apos;t remind me again
            </Label>
          </div>
          <AlertDialogCancel
            className={buttonVariants({ variant: "ghost" })}
            onClick={handleRemindLater}
          >
            Remind Later
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleGoToLesson}>
            <PlayCircle className="h-4 w-4" />
            Go to Lesson
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
