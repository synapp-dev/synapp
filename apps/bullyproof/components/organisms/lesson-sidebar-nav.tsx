"use client";

import {
  BookOpen,
  Users,
  ClipboardList,
  PlayCircle,
  MessageSquare,
  History,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { NavMain } from "@/components/organisms/nav-main";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { useLessonStatusRealtime } from "@/hooks/use-lesson-status-realtime";
import { useMeStore } from "@/entities/me/model/store";

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

export function LessonSidebarNav({
  schoolId,
  lessonId,
}: LessonSidebarNavProps) {
  const { data: lessonData, isLoading } = useLessonById(lessonId);

  // Listen for real-time status changes to enable/disable feedback button
  useLessonStatusRealtime(lessonId);

  // Check if current user is the lesson creator
  const currentUser = useMeStore((s) => s.currentUser);
  const isLessonCreator = currentUser?.id === lessonData?.createdByUserId;
  const canRunLesson = isLessonCreator;

  const isCompleted = lessonData?.status === "completed";
  const isFeedback = lessonData?.status === "feedback";
  const canProvideFeedback = isCompleted || isFeedback;

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

  const navItems = navItemsConfig.map((item) => ({
    title: item.title,
    url: item.url ? `${baseUrl}${item.url}` : baseUrl,
    icon: iconMap[item.iconName],
    exact: (item as { exact?: boolean }).exact ?? false,
    // Disable Run Lesson if user is not the lesson creator
    // Enable feedback button if lesson is feedback or completed
    disabled:
      item.disabled ||
      (item.title === "Run Lesson" && !canRunLesson) ||
      (item.title === "Feedback" && !canProvideFeedback),
    // Show appropriate disabled messages
    disabledMessage:
      item.disabledMessage ||
      (item.title === "Run Lesson" && !canRunLesson
        ? "Unauthorized"
        : item.title === "Feedback" && !canProvideFeedback
          ? "Locked"
          : item.disabled
            ? "Under Construction"
            : undefined),
  }));

  return <NavMain items={navItems} />;
}
