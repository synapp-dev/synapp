"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Users, Loader2, GraduationCap } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useParams } from "next/navigation";
import { useLessonById } from "@/entities/lessons/api/useLessonById";

export default function LessonClassesPage() {
  usePageTitle(["schools", "lessons", "classes"]);
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
          <p className="text-muted-foreground">Loading classes...</p>
        </div>
      </div>
    );
  }

  if (isError || !lessonData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive font-medium">
            {error?.message || "Failed to load lesson classes"}
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

  const assignedClasses = lessonData.assignedClasses || [];

  return (
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <GraduationCap className="h-8 w-8" />
          Classes
        </h1>
        <p className="text-muted-foreground">Classes assigned to this lesson</p>
      </div>

      {/* Classes Grid */}
      {assignedClasses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No classes assigned to this lesson.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignedClasses.map((assignedClass) => (
            <Card
              key={assignedClass.classId}
              className="hover:shadow-md transition-shadow h-full"
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {assignedClass.className}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignedClass.yearLevelDisplay ? (
                  <p className="text-sm text-muted-foreground">
                    {assignedClass.yearLevelDisplay}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No year level assigned
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
