"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Loader2 } from "lucide-react";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { certificationCourses } from "@/server/db/schema";
import { createSlug } from "@/utils/slug";

type Course = typeof certificationCourses.$inferSelect & {
  topicCount?: number;
};

export default function CoursesPage() {
  usePageTitle(["courses"]);

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await certificationApi.courses.list();
        if (result.error) {
          setError(result.error.message ?? "Failed to fetch courses");
          return;
        }

        if (result.data) {
          // Sort by sortIndex to ensure correct order
          const sorted = [...result.data].sort(
            (a, b) => a.sortIndex - b.sortIndex
          );
          setCourses(sorted);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Certification Courses</h1>
        <p className="text-muted-foreground">
          Browse available certification courses
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No courses available at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const courseSlug = createSlug(course.name);
            const courseHref = `/courses/${courseSlug}`;

            return (
              <Link key={course.id} href={courseHref}>
                <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle>{course.name}</CardTitle>
                    <CardDescription>
                      {course.topicCount ?? 0} {course.topicCount === 1 ? "topic" : "topics"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Code: {course.code}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
