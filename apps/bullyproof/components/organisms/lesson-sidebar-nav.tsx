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
  },
];

export function LessonSidebarNav({ schoolId, lessonId }: LessonSidebarNavProps) {
  const navItems = navItemsConfig.map(item => ({
    title: item.title,
    url: `/schools/${schoolId}/lessons/${lessonId}${item.url}`,
    icon: iconMap[item.iconName],
    exact: item.exact,
  }));

  return <NavMain items={navItems} />;
}

