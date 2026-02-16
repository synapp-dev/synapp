"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  ArrowLeft,
  Mail,
  BookOpen,
  GraduationCap,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Separator } from "@workspace/ui/components/separator";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { meApi, type UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { LessonCard, type Lesson } from "@/entities/lessons/ui/lesson-card";
import { apiFetch } from "@/lib/api/fetcher.client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { RoleBadges } from "@/components/atoms/role-badges";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";

interface TeacherPageClientProps {
  teacherSlug: string;
  schoolSlug: string;
}

function TeacherPageSkeleton({ schoolSlug }: { schoolSlug?: string }) {
  return (
    <div className="space-y-6">
      {/* Navigation skeleton */}
      <div className="flex items-center space-x-4">
        <Link
          href={schoolSlug ? `/schools/${schoolSlug}/teachers` : "/schools"}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teachers
        </Link>
        <div className="text-sm text-muted-foreground">/</div>
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Profile banner skeleton */}
      <div className="relative rounded-lg overflow-hidden h-[280px] bg-muted">
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent opacity-60"
          aria-hidden
        />
        <div className="relative h-full flex items-end gap-6 pt-8 px-8 pb-4">
          <Skeleton className="h-24 w-24 rounded-lg flex-shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-56" />
          </div>
        </div>
      </div>

      {/* Classes + Lessons skeleton */}
      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Skeleton className="h-40 w-64 shrink-0" />
              <Skeleton className="h-40 w-64 shrink-0" />
              <Skeleton className="h-40 w-64 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type TeacherClass = {
  classId: string;
  className: string;
  classCode: string | null;
  schoolId: string;
  schoolSlug: string | null;
  schoolName: string | null;
  active: boolean;
  createdAt: string;
};

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

export default function TeacherPageClient({
  teacherSlug,
  schoolSlug,
}: TeacherPageClientProps) {
  const [teacher, setTeacher] = useState<UserWithRolesAndSchools | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(!!schoolSlug && !!teacherSlug);

  // Resolve school from URL slug - don't rely on store timing
  const { data: school, isLoading: schoolLoading } = useSchoolBySlugQuery(
    schoolSlug || null,
    { enabled: !!schoolSlug }
  );
  const schoolId = school?.id;

  useEffect(() => {
    if (!schoolId || !teacherSlug) return;

    const controller = new AbortController();

    async function fetchTeacherData() {
      try {
        setLoading(true);
        setTeacher(null);
        setLessons([]);
        setTeacherClasses([]);

        const usersResult = await meApi.get.listAllUsers({
          schoolId: schoolId,
          limit: 100,
        });

        if (controller.signal.aborted) return;
        if (usersResult.error || !usersResult.data) {
          console.error("Failed to fetch users:", usersResult.error);
          setLoading(false);
          return;
        }

        const normalizedSlug = teacherSlug.toLowerCase().trim();

        // Match by slug: "jourdain-girton" must match user with name "Jourdain Girton"
        const foundTeacher = usersResult.data.users.find((user) => {
          const firstName = user.firstName || "";
          const lastName = user.lastName || "";
          const fullName = `${firstName} ${lastName}`.trim();
          const userSlug = nameToSlug(fullName);
          return userSlug === normalizedSlug;
        });

        if (controller.signal.aborted) return;
        if (!foundTeacher) {
          setLoading(false);
          return;
        }

        setTeacher(foundTeacher);

        // Fetch classes at this school
        const classesResult = await apiFetch<TeacherClass[]>(
          `/users/${foundTeacher.id}/classes?schoolId=${schoolId}`
        );
        if (!controller.signal.aborted && !classesResult.error && classesResult.data) {
          setTeacherClasses(classesResult.data);
        }

        const lessonsResult = await lessonsApi.get.list({
          teacherId: foundTeacher.id,
          schoolId: schoolId,
          limit: 50,
        });

        if (controller.signal.aborted) return;
        if (!lessonsResult.error && lessonsResult.data) {
          const lessonsWithDetails = await Promise.all(
            lessonsResult.data.map(async (lesson) => {
              const lessonDetailResult = await lessonsApi.get.byId(lesson.id);
              if (controller.signal.aborted) return lesson;
              if (!lessonDetailResult.error && lessonDetailResult.data) {
                const detail = lessonDetailResult.data;
                return {
                  ...lesson,
                  topic: detail.topic,
                  assignedClasses: detail.assignedClasses || [],
                  teacher: detail.teacher ?? {
                    id: foundTeacher.id,
                    firstName: foundTeacher.firstName,
                    lastName: foundTeacher.lastName,
                    email: foundTeacher.email,
                  },
                };
              }
              return lesson;
            })
          );
          if (!controller.signal.aborted) {
            setLessons(lessonsWithDetails);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch teacher data:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchTeacherData();
    return () => controller.abort();
  }, [schoolId, teacherSlug]);

  // Call hooks unconditionally (before any early returns) to satisfy Rules of Hooks
  const schoolBanner = useStorageImageUrl(school?.bannerUrl ?? null);
  const schoolAvatar = useStorageImageUrl(school?.avatarUrl ?? null);

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
    if (!schoolId) return [];
    return user.schoolRoles.filter(
      (role) =>
        role.schoolId === schoolId &&
        role.roleKey !== "SCHOOL_LICENCE"
    );
  };

  const isReady = !!schoolSlug && !!teacherSlug;
  const isWaitingForSchool = isReady && schoolLoading;
  const isFetchingTeacher = isReady && loading;

  if (!isReady || isWaitingForSchool || isFetchingTeacher) {
    return <TeacherPageSkeleton schoolSlug={schoolSlug} />;
  }

  if (!teacher) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Teacher not found</h1>
          <p className="text-muted-foreground">
            The teacher you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const fullName = getFullName(teacher);
  const schoolRoles = getSchoolRoles(teacher);
  const bannerUrl = schoolBanner.url;
  const avatarUrl = schoolAvatar.url;
  const imagesReady = !schoolBanner.loading && !schoolAvatar.loading;
  const firstName = teacher.firstName?.trim() || "";
  const lastName = teacher.lastName?.trim() || "";

  const TEACHER_BANNER_ANIMATION_DELAYS = {
    card: "0ms",
    banner: "150ms",
    gradient: "400ms",
    avatar: "600ms",
    name: "700ms",
    roles: "850ms",
  } as const;

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

      {/* Profile Banner - same treatment as school home header */}
      {!imagesReady ? (
        <div className="relative rounded-lg overflow-hidden h-[280px] bg-muted">
          <div
            className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent opacity-60"
            aria-hidden
          />
          <div className="relative h-full flex items-end gap-6 pt-8 px-8 pb-4">
            <Skeleton className="h-24 w-24 rounded-lg flex-shrink-0" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-56" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`relative rounded-lg overflow-hidden h-[280px] opacity-0 animate-slide-down-fade-in ${bannerUrl ? "bg-transparent" : "bg-[var(--brand-bullyproof-primary)]"}`}
          style={{
            animationDelay: TEACHER_BANNER_ANIMATION_DELAYS.card,
            animationFillMode: "forwards",
          }}
        >
          {bannerUrl && (
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute inset-0 opacity-0 [animation:var(--animate-banner-reveal)]"
                style={{
                  backgroundImage: `url(${bannerUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  animationDelay: TEACHER_BANNER_ANIMATION_DELAYS.banner,
                  animationFillMode: "forwards",
                }}
                aria-hidden
              />
            </div>
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent opacity-0 [animation:var(--animate-slide-up-from-bottom)]"
            style={{
              animationDelay: TEACHER_BANNER_ANIMATION_DELAYS.gradient,
              animationFillMode: "forwards",
            }}
            aria-hidden
          />
          <div className="relative h-full flex items-end gap-6 pt-8 px-8 pb-4">
            <div
              className="flex-shrink-0 opacity-0 animate-slide-up-fade-in"
              style={{
                animationDelay: TEACHER_BANNER_ANIMATION_DELAYS.avatar,
                animationFillMode: "forwards",
              }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={school?.name ?? "School"}
                  width={600}
                  height={600}
                  className="w-auto h-24 rounded-lg object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/bp-small-logo.svg"
                    alt=""
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain opacity-90"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1 pb-0.5">
              <div
                className="text-white opacity-0 animate-slide-left-fade-in"
                style={{
                  animationDelay: TEACHER_BANNER_ANIMATION_DELAYS.name,
                  animationFillMode: "forwards",
                }}
              >
                {firstName ? (
                  <div className="text-xl font-medium text-white/90">{firstName}</div>
                ) : null}
                <div className="text-4xl font-bold text-white">
                  {lastName || fullName || teacher.email}
                </div>
              </div>
              <div
                className="flex items-center gap-3 flex-wrap opacity-0 animate-slide-left-fade-in"
                style={{
                  animationDelay: TEACHER_BANNER_ANIMATION_DELAYS.roles,
                  animationFillMode: "forwards",
                }}
              >
                {schoolRoles.length > 0 && (
                  <RoleBadges
                    roles={schoolRoles.map((r) => ({
                      roleKey: r.roleKey || "",
                      roleName: r.roleName || undefined,
                    }))}
                    variant="joined"
                    size="sm"
                  />
                )}
                {schoolRoles.length > 0 && (
                  <Separator orientation="vertical" className="h-6 bg-white/70" />
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    window.location.href = `mailto:${teacher.email}`;
                  }}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Classes assigned at this school */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5" />
              Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teacherClasses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No classes assigned at this school.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[400px] overflow-auto">
                {teacherClasses.map((c) => (
                  <Link
                    key={c.classId}
                    href={`/schools/${schoolSlug}/classes`}
                    className="block"
                  >
                    <Card className="py-2.5 px-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
                        <span className="text-sm">{c.className}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lessons carousel - lessons this teacher owns */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Lessons
            </CardTitle>
            {lessons.length > 0 ? (
              <Link
                href={`/schools/${schoolSlug}/lessons`}
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No lessons for this teacher at this school.
                </p>
              </div>
            ) : (
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2">
                  {lessons.map((lesson) => (
                    <CarouselItem
                      key={lesson.id}
                      className="pl-2 basis-[min(300px,90vw)] md:basis-[320px]"
                    >
                      <LessonCard
                        lesson={lesson}
                        schoolSlug={schoolSlug}
                        displayOnly={false}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="-left-4" />
                <CarouselNext className="-right-4" />
              </Carousel>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

