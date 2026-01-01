"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { LessonWizard } from "@/components/organisms/lesson-wizard";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSchoolStore } from "@/stores/school-store";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { BookOpen, Plus, Loader2, Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@workspace/ui/components/input";

// Simple fuzzy search function
function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true;

  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower.includes(queryLower)) return true;

  // Fuzzy match: check if all characters in query appear in order in text
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === queryLower.length;
}

type Lesson = {
  id: string;
  schoolId: string;
  topicId: string;
  createdByUserId: string | null;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  topic?: { title?: string } | null;
  teacher?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  assignedClasses?: Array<{
    classId: string;
    className: string;
    classCode: string | null;
  }> | null;
};

export default function LessonsPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  usePageTitle(["schools", "lessons"]);
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    params.then(({ school_id }) => setSchoolSlug(school_id));
  }, [params]);

  // Check for dialog query parameter and open wizard if present
  useEffect(() => {
    const dialog = searchParams?.get("dialog");
    const startingYourLesson = searchParams?.get("startingYourLesson");
    if ((dialog === "add-new-lesson" || startingYourLesson === "true") && currentSchool?.id) {
      setIsWizardOpen(true);
    }
  }, [searchParams, currentSchool?.id]);

  useEffect(() => {
    async function fetchLessons() {
      // Wait for school to be loaded from the store (set by layout)
      if (!currentSchool?.id) {
        setLoading(true);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch lessons for this school
        const result = await lessonsApi.get.list({
          schoolId: currentSchool.id,
          limit: 100,
        });

        if (result.error) {
          setError(result.error.message || "Failed to load lessons");
          setLessons([]);
        } else {
          // Fetch details for each lesson to get topic and teacher info
          const lessonsWithDetails = await Promise.all(
            (result.data || []).map(async (lesson) => {
              const lessonDetailResult = await lessonsApi.get.byId(lesson.id);
              if (!lessonDetailResult.error && lessonDetailResult.data) {
                return {
                  ...lesson,
                  topic: lessonDetailResult.data.topic,
                  teacher: lessonDetailResult.data.teacher,
                  assignedClasses:
                    lessonDetailResult.data.assignedClasses || [],
                };
              }
              return lesson;
            })
          );
          setLessons(lessonsWithDetails);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
        setLessons([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLessons();
  }, [currentSchool?.id]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending_review":
        return "secondary";
      case "in_progress":
        return "secondary";
      case "scheduled":
        return "outline";
      case "draft":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getTeacherName = (lesson: Lesson) => {
    if (lesson.teacher) {
      const firstName = lesson.teacher.firstName || "";
      const lastName = lesson.teacher.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || lesson.teacher.email || "Unknown Teacher";
    }
    return "Unknown Teacher";
  };

  // Filter lessons based on search query
  const filteredLessons = useMemo(() => {
    if (!searchQuery.trim()) return lessons;

    return lessons.filter((lesson) => {
      const topicTitle = lesson.topic?.title || "";
      const teacherName = getTeacherName(lesson);
      const status = lesson.status || "";
      const classNames =
        lesson.assignedClasses?.map((c) => c.className).join(" ") || "";

      return (
        fuzzySearch(searchQuery, topicTitle) ||
        fuzzySearch(searchQuery, teacherName) ||
        fuzzySearch(searchQuery, status) ||
        fuzzySearch(searchQuery, classNames)
      );
    });
  }, [lessons, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Lessons</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading lessons...</p>
        </div>
      </div>
    );
  }

  if (!currentSchool) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">School not found</h1>
          <p className="text-muted-foreground">
            The school you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Lessons</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lessons by topic, teacher, status, or class..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Lessons Grid */}
        {error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-destructive">
                  Error loading lessons: {error}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Start New Lesson Card - Always First */}
            <button
              onClick={() => setIsWizardOpen(true)}
              className="block text-left"
            >
              <Card className="hover:shadow-md transition-shadow h-full border-2 border-dashed border-muted-foreground/40 hover:border-primary/50 cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 py-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg text-center">
                        Start New Lesson
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Create a new lesson for your classes
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>

            {/* Existing Lessons */}
            {filteredLessons.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? "No lessons found matching your search."
                          : "No lessons found for this school."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              filteredLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/schools/${schoolSlug}/lessons/${lesson.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {lesson.topic?.title || "Untitled Lesson"}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={getStatusBadgeVariant(lesson.status)}
                          className="shrink-0"
                        >
                          {formatStatus(lesson.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Teacher: </span>
                          <span className="font-medium">
                            {getTeacherName(lesson)}
                          </span>
                        </div>
                        {lesson.scheduledFor && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(
                                new Date(lesson.scheduledFor),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </span>
                          </div>
                        )}
                        {lesson.assignedClasses &&
                          lesson.assignedClasses.length > 0 && (
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">
                                Classes ({lesson.assignedClasses.length}):
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {lesson.assignedClasses.map((classItem) => (
                                  <Badge
                                    key={classItem.classId}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {classItem.className}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <LessonWizard
        schoolId={schoolSlug}
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
      />
    </>
  );
}
