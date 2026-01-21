"use client";

import { useState, useEffect } from "react";
import { PlatformAdminGuard } from "@/components/molecules/platform-admin-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  ArrowLeft,
  Mail,
  Calendar,
  BookOpen,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { meApi, type UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { useSchoolStore } from "@/stores/school-store";
import { format } from "date-fns";

interface TeacherPageClientProps {
  teacherSlug: string;
  schoolSlug: string;
}

type Lesson = {
  id: string;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  topicId: string;
  topic?: {
    id: string;
    title: string;
  };
  assignedClasses?: Array<{
    classId: string;
    className: string;
    classCode: string | null;
  }>;
};

export default function TeacherPageClient({
  teacherSlug,
  schoolSlug,
}: TeacherPageClientProps) {
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const [teacher, setTeacher] = useState<UserWithRolesAndSchools | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Convert slug back to name for matching
  const teacherNameFromSlug = teacherSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  useEffect(() => {
    async function fetchTeacherData() {
      const schoolId = currentSchool?.id;
      
      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch all users for the school - use schoolId (UUID) directly, not slug
        const usersResult = await meApi.get.listAllUsers({
          schoolId: schoolId,
          limit: 100,
        });

        if (usersResult.error || !usersResult.data) {
          console.error("Failed to fetch users:", usersResult.error);
          setLoading(false);
          return;
        }

        // Find teacher by matching name (slug converted back to name)
        // Note: API returns { users: [...], totalCount: number }
        const foundTeacher = usersResult.data.users.find((user) => {
          const firstName = user.firstName || "";
          const lastName = user.lastName || "";
          const fullName = `${firstName} ${lastName}`.trim();
          
          // Match by full name or check if slug matches
          return (
            fullName.toLowerCase() === teacherNameFromSlug.toLowerCase() ||
            fullName.toLowerCase().replace(/\s+/g, "-") === teacherSlug.toLowerCase()
          );
        });

        if (!foundTeacher) {
          setLoading(false);
          return;
        }

        setTeacher(foundTeacher);

        // Fetch lessons for this teacher
        const lessonsResult = await lessonsApi.get.list({
          teacherId: foundTeacher.id,
          limit: 50,
        });

        if (!lessonsResult.error && lessonsResult.data) {
          // Fetch details for each lesson to get topic and classes
          const lessonsWithDetails = await Promise.all(
            lessonsResult.data.map(async (lesson) => {
              const lessonDetailResult = await lessonsApi.get.byId(lesson.id);
              if (!lessonDetailResult.error && lessonDetailResult.data) {
                return {
                  ...lesson,
                  topic: lessonDetailResult.data.topic,
                  assignedClasses: lessonDetailResult.data.assignedClasses || [],
                };
              }
              return lesson;
            })
          );
          setLessons(lessonsWithDetails);
        }
      } catch (error) {
        console.error("Failed to fetch teacher data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTeacherData();
  }, [teacherSlug, teacherNameFromSlug, currentSchool?.slug, currentSchool?.id]);

  const getFullName = (user: UserWithRolesAndSchools) => {
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

  const getSchoolRoles = (user: UserWithRolesAndSchools) => {
    const schoolId = currentSchool?.id;
    if (!schoolId) return [];
    // Filter out SCHOOL_LICENCE role
    return user.schoolRoles.filter(
      (role) =>
        role.schoolId === schoolId &&
        role.roleKey !== "SCHOOL_LICENCE"
    );
  };

  if (loading) {
    return (
      <>
        <PlatformAdminGuard />
        <div className="space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading teacher profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (!teacher) {
    return (
      <>
        <PlatformAdminGuard />
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Teacher not found</h1>
            <p className="text-muted-foreground">
              The teacher you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </>
    );
  }

  const fullName = getFullName(teacher);
  const schoolRoles = getSchoolRoles(teacher);
  const primaryRole = schoolRoles[0];
  const joinDate = teacher.createdAt
    ? new Date(teacher.createdAt).toLocaleDateString()
    : null;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center space-x-4">
        <Link
          href={`/schools/${schoolSlug}/teachers`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teachers
        </Link>
        <div className="text-sm text-muted-foreground">/</div>
        <div className="text-sm font-medium">{fullName}</div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={teacher.avatarUrl || undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(teacher)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-3xl font-bold">{fullName}</h1>
              </div>
              {primaryRole && (
                <p className="text-lg text-muted-foreground mb-4">
                  {primaryRole.roleName || primaryRole.roleKey}
                </p>
              )}
              <div className="flex items-center space-x-6 mb-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{teacher.email}</span>
                </div>
                {joinDate && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Joined {joinDate}</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `mailto:${teacher.email}`;
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lessons Taught */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No lessons found for this teacher.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h4 className="font-medium">
                            <Link
                              href={`/schools/${schoolSlug}/lessons/${lesson.id}`}
                              className="hover:text-primary hover:underline"
                            >
                              {lesson.topic?.title || "Untitled Lesson"}
                            </Link>
                          </h4>
                          {lesson.status === "in_progress" && (
                            <Badge 
                              className="text-xs bg-orange-500 text-white animate-pulse"
                            >
                              Active
                            </Badge>
                          )}
                        </div>
                        {lesson.assignedClasses && lesson.assignedClasses.length > 0 && (
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
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {lesson.scheduledFor ? (
                          format(new Date(lesson.scheduledFor), "MMM d, yyyy")
                        ) : lesson.createdAt ? (
                          format(new Date(lesson.createdAt), "MMM d, yyyy")
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No recent activity to display.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

