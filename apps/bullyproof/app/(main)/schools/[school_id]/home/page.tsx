"use client";

import { useEffect, useState, useMemo } from "react";
import { PlatformAdminGuard } from "@/components/molecules/platform-admin-guard";
import { useSchoolStore } from "@/stores/school-store";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const currentSchool = useSchoolStore((state) => state.currentSchool);

  useEffect(() => {
    params.then(({ school_id }) => setSchoolSlug(school_id));
  }, [params]);

  useEffect(() => {
    async function fetchData() {
      const schoolId = currentSchool?.id;

      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch teachers - use schoolId (UUID) directly, not slug
        const teachersResult = await meApi.get.listAllUsers({
          schoolId: schoolId,
          limit: 100,
        });

        if (!teachersResult.error && teachersResult.data) {
          // Filter to only show teachers and school admins (exclude SCHOOL_LICENCE users)
          // Note: API returns { users: [...], totalCount: number }
          const filteredTeachers = teachersResult.data.users.filter((user) => {
            const schoolRoles = user.schoolRoles.filter(
              (role) => role.schoolId === schoolId
            );
            // Exclude SCHOOL_LICENCE users
            const hasLicenceRole = schoolRoles.some(
              (role) => role.roleKey === "SCHOOL_LICENCE"
            );
            if (hasLicenceRole) return false;
            // Include TEACHER and SCHOOL_ADMIN
            return schoolRoles.some(
              (role) =>
                role.roleKey === "TEACHER" ||
                role.roleKey === "SCHOOL_ADMIN"
            );
          });

          setTeachers(filteredTeachers);

          // Fetch lessons directly by schoolId (more efficient and correct)
          if (schoolId) {
            const lessonsResult = await lessonsApi.get.list({
              schoolId: schoolId,
              limit: 100,
            });

            if (!lessonsResult.error && lessonsResult.data) {
              // Fetch details for each lesson
              const lessonsWithDetails = await Promise.all(
                lessonsResult.data.map(async (lesson) => {
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
              setLessons(lessonsWithDetails);
            } else {
              setLessons([]);
            }
          } else {
            setLessons([]);
          }
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

  const getInitials = (user: UserWithRolesAndSchools) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getTeacherSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-");
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

  // Extract school metadata similar to school-switcher
  const getSchoolMetadata = () => {
    if (!currentSchool) return { stateText: "", sectorText: "", levelsText: "" };

    const stateText = currentSchool.state
      ? typeof currentSchool.state === "string"
        ? currentSchool.state.toUpperCase()
        : ""
      : "";

    const sectorText =
      typeof currentSchool.sector === "string" ? currentSchool.sector : "";

    let levelsText = "";
    if (Array.isArray(currentSchool.levels) && currentSchool.levels.length > 0) {
      const levelNames = currentSchool.levels.map((lvl) =>
        typeof lvl === "string" ? lvl : (lvl as any)?.name || (lvl as any)?.key || ""
      );
      const lower = levelNames.map((s) => s.toLowerCase());
      const hasPrimary = lower.some((s) => s.includes("primary"));
      const hasSecondary = lower.some((s) => s.includes("secondary"));
      if (hasPrimary && hasSecondary) levelsText = "P-12";
      else if (hasPrimary) levelsText = "Primary";
      else if (hasSecondary) levelsText = "Secondary";
      else levelsText = levelNames.join(", ");
    }

    return { stateText, sectorText, levelsText };
  };

  // Filter out SCHOOL_LICENCE users
  const filteredUsers = useMemo(() => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return [];

    return teachers.filter((user) => {
      const schoolRoles = user.schoolRoles.filter(
        (role) => role.schoolId === schoolId
      );
      // Exclude users with SCHOOL_LICENCE role
      return !schoolRoles.some((role) => role.roleKey === "SCHOOL_LICENCE");
    });
  }, [teachers, currentSchool?.id]);

  if (loading) {
    return (
      <>
        <PlatformAdminGuard />
        <div className="space-y-8">
        {/* Hero Section Skeleton */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-8 border border-border">
          <Skeleton className="h-10 w-64 mb-2" />
          <div className="flex items-center gap-1 mt-2">
            <Skeleton className="h-4 w-16" />
            <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
            <Skeleton className="h-4 w-20" />
            <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* 2 Column Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lessons Card Skeleton */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-7 w-24" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-muted/50 rounded-lg p-3 border border-border/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Users Card Skeleton */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <Skeleton className="h-7 w-16 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-muted/50 rounded-lg p-3 border border-border/50 flex items-center gap-3"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
    </>
  );
}

  const { stateText, sectorText, levelsText } = getSchoolMetadata();
  const metadataParts = [stateText, sectorText, levelsText].filter(Boolean);

  return (
    <>
      <PlatformAdminGuard />
      <div className="space-y-8">
        {/* Hero Section */}
        {currentSchool && (
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-8 border border-border">
            <h1 className="text-4xl font-bold mb-2">{currentSchool.name}</h1>
            {metadataParts.length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                {metadataParts.map((part, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="capitalize">{part}</span>
                    {index < metadataParts.length - 1 && (
                      <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lessons Card */}
          <div
            onClick={() => router.push(`/schools/${schoolSlug}/lessons`)}
            className="bg-card rounded-lg p-6 border border-border hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Lessons</h2>
            </div>
            {lessons.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/schools/${schoolSlug}/lessons/${lesson.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block bg-muted/50 rounded-lg p-3 border border-border/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">
                          {getLessonTitle(lesson)}
                        </h3>
                        <div className="text-xs text-muted-foreground mt-1">
                          {getTeacherNameFromLesson(lesson)}
                        </div>
                        {lesson.scheduledFor && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(lesson.scheduledFor), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(
                          lesson.status
                        )}`}
                      >
                        {lesson.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No lessons found
              </div>
            )}
          </div>

          {/* Users Card */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4">Staff</h2>
            {filteredUsers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                {filteredUsers.map((user) => {
                  const fullName = getTeacherName(user);
                  const teacherSlug = getTeacherSlug(fullName);
                  return (
                    <Link
                      key={user.id}
                      href={`/schools/${schoolSlug}/teachers/${teacherSlug}`}
                      className="bg-muted/50 rounded-lg p-3 border border-border/50 hover:bg-muted/70 transition-colors flex items-center gap-3"
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium text-sm truncate min-w-0">
                        {fullName}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No staff found
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
