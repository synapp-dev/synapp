"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { User, BookOpen, Users, Loader2 } from "lucide-react";
import { useLessonById } from "@/entities/lessons/api/useLessonById";
import { useParams } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";

function getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return first + last || "?";
}

export default function LessonOverviewPage() {
  usePageTitle(["schools", "lessons", "overview"]);
  const params = useParams();
  const lesson_id = params?.lesson_id as string;

  const {
    data: lessonData,
    isLoading,
    isError,
    error,
  } = useLessonById(lesson_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading lesson details...</p>
        </div>
      </div>
    );
  }

  if (isError || !lessonData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive font-medium">
            {error?.message || "Failed to load lesson details"}
          </p>
          <p className="text-muted-foreground mt-2">
            {error?.message?.includes("Unauthorized")
              ? "You don't have permission to view this lesson"
              : "Please try again later"}
          </p>
        </div>
      </div>
    );
  }

  const teacherName = lessonData.teacher
    ? `${lessonData.teacher.firstName || ""} ${lessonData.teacher.lastName || ""}`.trim() ||
      lessonData.teacher.email ||
      "Unknown Teacher"
    : "Unknown Teacher";

  const teacherInitials = lessonData.teacher
    ? getInitials(lessonData.teacher.firstName, lessonData.teacher.lastName)
    : "?";

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
        {/* Teacher Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Teacher
            </CardTitle>
            <CardDescription>Who started this lesson</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {teacherInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{teacherName}</p>
                {lessonData.teacher?.email && (
                  <p className="text-sm text-muted-foreground">
                    {lessonData.teacher.email}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topic Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Topic
            </CardTitle>
            <CardDescription>The topic for this lesson</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {lessonData.topic?.title || "No topic assigned"}
            </p>
          </CardContent>
        </Card>

        {/* Classes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Classes
            </CardTitle>
            <CardDescription>
              {lessonData.assignedClasses?.length || 0} class
              {(lessonData.assignedClasses?.length || 0) !== 1 ? "es" : ""}{" "}
              taking this lesson
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lessonData.assignedClasses &&
            lessonData.assignedClasses.length > 0 ? (
              <div className="space-y-3">
                {lessonData.assignedClasses.map((assignedClass) => (
                  <div
                    key={assignedClass.classId}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <p className="font-medium">{assignedClass.className}</p>
                    {assignedClass.classCode && (
                      <p className="text-sm text-muted-foreground">
                        Code: {assignedClass.classCode}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No classes assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
