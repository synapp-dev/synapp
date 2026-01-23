"use client";

import {
  FileText,
  Info,
  Star,
  BarChart3,
  Trash2,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import type { certificationCourses } from "@/server/db/schema";

export type CertificationCourseTab = "information" | "topics" | "results" | "rating";

type Course = typeof certificationCourses.$inferSelect & {
  topicCount?: number;
};

interface CertificationCourseSidebarProps {
  activeTab: CertificationCourseTab;
  onTabChange: (tab: CertificationCourseTab) => void;
  course?: Course | null;
  onDeleteClick?: () => void;
  isDeleting?: boolean;
}

interface TabItem {
  id: CertificationCourseTab;
  label: string;
  icon: LucideIcon;
}

const tabs: TabItem[] = [
  {
    id: "information",
    label: "Information",
    icon: Info,
  },
  {
    id: "topics",
    label: "Topics",
    icon: FileText,
  },
  {
    id: "results",
    label: "Results",
    icon: BarChart3,
  },
  {
    id: "rating",
    label: "Reviews/Feedback",
    icon: Star,
  },
];

export function CertificationCourseSidebar({
  activeTab,
  onTabChange,
  course,
  onDeleteClick,
  isDeleting = false,
}: CertificationCourseSidebarProps) {
  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-background rounded-lg border p-4 space-y-1 flex flex-col">
        <div className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Button
                key={tab.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive && "bg-secondary"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>

        {course && onDeleteClick && (
          <>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive hover:text-secondary"
              onClick={onDeleteClick}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Course
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
