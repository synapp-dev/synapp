"use client";

import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getDisplayStatus } from "@/utils/lesson-status";

interface LessonHeaderProps {
  lessonId: string;
}

export function LessonHeader({ lessonId }: LessonHeaderProps) {
  const { data: lessonData, isLoading } = useLessonById(lessonId);

  if (isLoading || !lessonData) {
    return (
      <div className="border-b pb-4 mb-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
    );
  }

  const topic = lessonData.topic as any;
  const assignedClasses = lessonData.assignedClasses || [];
  const status = getDisplayStatus(lessonData.status || "", lessonData.scheduledFor);
  
  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "default" as const;
      case "feedback":
        return "secondary" as const;
      case "in progress":
        return "secondary" as const;
      case "scheduled":
        return "outline" as const;
      case "preparing":
        return "outline" as const;
      case "ready":
        return "default" as const;
      case "cancelled":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    
      <div className="space-y-3 bg-muted p-6 rounded-lg">
        {/* Lesson Label */}
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Lesson
        </p>
        
        {/* Topic Number and Name */}
        {topic && (
          <div className="flex items-center gap-2">
            {topic.stageOrder !== null && topic.stageOrder !== undefined && (
              <Badge
                variant="secondary"
                className="text-xs font-bold border-0 py-0 px-1.5 h-5 rounded-sm"
              >
                L{topic.stageOrder}
              </Badge>
            )}
            <h2 className="text-2xl font-semibold text-foreground capitalize">
              {topic.title}
            </h2>
          </div>
        )}
        
        {/* Classes and Status */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Class Badges */}
          {assignedClasses.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              {assignedClasses.map((classItem: any) => (
                <Badge
                  key={classItem.classId}
                  variant="outline"
                  className="text-xs"
                >
                  {classItem.className}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No classes assigned</span>
          )}
          
          {/* Status Badge */}
          <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
            {formatStatus(status)}
          </Badge>
        </div>
      </div>
   
  );
}
