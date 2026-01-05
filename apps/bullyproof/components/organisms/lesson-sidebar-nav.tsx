"use client";

import {
  BookOpen,
  Users,
  ClipboardList,
  PlayCircle,
  MessageSquare,
  History,
  type LucideIcon,
} from "lucide-react";
import { NavMain } from "@/components/organisms/nav-main";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { useLessonStatusRealtime } from "@/hooks/use-lesson-status-realtime";

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
};

const navItemsConfig = [
  {
    title: "Overview",
    url: "",
    iconName: "BookOpen",
    exact: true,
  },
  {
    title: "Classes",
    url: "/classes",
    iconName: "Users",
  },
  {
    title: "Prepare",
    url: "/prepare",
    iconName: "ClipboardList",
  },
  {
    title: "Deliver",
    url: "/deliver",
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

  const isCompleted = lessonData?.status === "completed";
  const isPendingReview = lessonData?.status === "pending_review";
  const canProvideFeedback = isCompleted || isPendingReview;

  // Debug logging (can be removed later)
  if (process.env.NODE_ENV === "development") {
    console.log("[LessonSidebarNav] Lesson status:", {
      lessonId,
      status: lessonData?.status,
      isCompleted,
      isPendingReview,
      canProvideFeedback,
      isLoading,
    });
  }

  const navItems = navItemsConfig.map((item) => ({
    title: item.title,
    url: `/schools/${schoolId}/lessons/${lessonId}${item.url}`,
    icon: iconMap[item.iconName],
    exact: item.exact,
    // Enable feedback button if lesson is pending_review or completed
    disabled:
      item.disabled || (item.title === "Feedback" && !canProvideFeedback),
    // Show "Locked" for Feedback when disabled, "Under Construction" for History
    disabledMessage:
      item.title === "Feedback" && !canProvideFeedback
        ? "Locked"
        : item.disabled
          ? "Under Construction"
          : undefined,
  }));

  return <NavMain items={navItems} />;
}
