"use client";

import { useEffect, useState, useMemo } from "react";
import { useSchoolStore } from "@/stores/school-store";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { Button } from "@workspace/ui/components/button";
import { LessonWizard } from "@/components/organisms/lesson-wizard";
import { Plus } from "lucide-react";
import { format } from "date-fns";

type Lesson = {
  id: string;
  schoolId: string;
  topicId: string;
  createdByUserId: string | null;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  topic?: {
    title: string;
  };
  teacher?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

export default function HomePage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [teachers, setTeachers] = useState<UserWithRolesAndSchools[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const currentSchool = useSchoolStore((state) => state.currentSchool);

  useEffect(() => {
    params.then(({ school_id }) => setSchoolSlug(school_id));
  }, [params]);

  useEffect(() => {
    async function fetchData() {
      const schoolIdentifier = currentSchool?.slug || currentSchool?.id;

      if (!schoolIdentifier) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch teachers
        const teachersResult = await meApi.get.listAllUsers({
          schoolId: schoolIdentifier,
          limit: 100,
        });

        if (!teachersResult.error && teachersResult.data) {
          // Filter to only show teachers (exclude SCHOOL_ADMIN only users)
          const schoolId = currentSchool?.id;
          const filteredTeachers = schoolId
            ? teachersResult.data.filter((user) => {
                const schoolRoles = user.schoolRoles.filter(
                  (role) => role.schoolId === schoolId
                );
                return schoolRoles.some(
                  (role) =>
                    role.roleKey === "TEACHER" ||
                    role.roleKey === "SCHOOL_ADMIN"
                );
              })
            : teachersResult.data;

          setTeachers(filteredTeachers);

          // Fetch lessons for each teacher
          const allLessons: Lesson[] = [];

          if (schoolId) {
            for (const teacher of filteredTeachers) {
              const lessonsResult = await lessonsApi.get.list({
                teacherId: teacher.id,
                limit: 100,
              });

              if (!lessonsResult.error && lessonsResult.data) {
                // Filter lessons by schoolId and fetch details
                const schoolLessons = lessonsResult.data.filter(
                  (lesson) => lesson.schoolId === schoolId
                );

                const lessonsWithDetails = await Promise.all(
                  schoolLessons.map(async (lesson) => {
                    const lessonDetailResult = await lessonsApi.get.byId(
                      lesson.id
                    );
                    if (!lessonDetailResult.error && lessonDetailResult.data) {
                      return {
                        ...lesson,
                        topic: lessonDetailResult.data.topic,
                        teacher: lessonDetailResult.data.teacher,
                      };
                    }
                    return lesson;
                  })
                );
                allLessons.push(...lessonsWithDetails);
              }
            }
          }

          setLessons(allLessons);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (currentSchool) {
      fetchData();
    }
  }, [currentSchool?.slug, currentSchool?.id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good morning";
    } else if (hour < 18) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  };

  const getTeacherName = (user: UserWithRolesAndSchools) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName} ${lastName}`.trim() || user.email;
  };

  const getLessonTitle = (lesson: Lesson) => {
    return lesson.topic?.title || "Untitled Lesson";
  };

  const getTeacherNameFromLesson = (lesson: Lesson) => {
    if (lesson.teacher) {
      const firstName = lesson.teacher.firstName || "";
      const lastName = lesson.teacher.lastName || "";
      return `${firstName} ${lastName}`.trim() || lesson.teacher.email;
    }
    return "Unknown";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-8 border border-border">
          <h1 className="text-4xl font-bold mb-2">{getGreeting()}</h1>
          {currentSchool && (
            <p className="text-xl text-muted-foreground">
              Welcome to {currentSchool.name}
            </p>
          )}
        </div>

        {/* School Info */}
        {currentSchool && (
          <div className="bg-card rounded-lg p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4">School Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="text-lg font-medium">{currentSchool.name}</div>
              </div>
              {currentSchool.state && (
                <div>
                  <div className="text-sm text-muted-foreground">State</div>
                  <div className="text-lg font-medium">
                    {currentSchool.state.toUpperCase()}
                  </div>
                </div>
              )}
              {currentSchool.sector && (
                <div>
                  <div className="text-sm text-muted-foreground">Sector</div>
                  <div className="text-lg font-medium capitalize">
                    {currentSchool.sector}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lessons List */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              All Lessons ({lessons.length})
            </h2>
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Start New Lesson
            </Button>
          </div>
          {lessons.length > 0 ? (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-muted/50 rounded-lg p-4 border border-border/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium">
                          {getLessonTitle(lesson)}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                            lesson.status
                          )}`}
                        >
                          {lesson.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Teacher: {getTeacherNameFromLesson(lesson)}
                      </div>
                      {lesson.scheduledFor && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Scheduled:{" "}
                          {format(new Date(lesson.scheduledFor), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No lessons found. Start by creating a new lesson!
            </div>
          )}
        </div>

        {/* Teachers List */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-semibold mb-4">
            All Teachers ({teachers.length})
          </h2>
          {teachers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="bg-muted/50 rounded-lg p-4 border border-border/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="font-medium">{getTeacherName(teacher)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {teacher.email}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No teachers found
            </div>
          )}
        </div>
      </div>

      <LessonWizard
        schoolId={schoolSlug}
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
      />
    </>
  );
}
