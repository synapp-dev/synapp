"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { LessonCard, type Lesson } from "@/entities/lessons/ui/lesson-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { RoleBadges } from "@/components/atoms/role-badges";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import {
  useUserClasses,
} from "@/entities/users/api/user-details-queries";
import { useLessonsByTeacherAtSchool } from "@/entities/lessons/api/useLessonsByTeacherAtSchool";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

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
        <div className="h-4 w-28 rounded-sm border-2 border-dashed border-border/30 opacity-40" />
      </div>

      {/* Profile banner skeleton */}
      <div className="relative rounded-lg overflow-hidden h-[280px] border-2 border-dashed border-border/25 opacity-35">
        <div className="relative h-full flex items-end gap-6 pt-8 px-8 pb-4">
          <div className="h-[106px] w-[106px] rounded-lg border-2 border-dashed border-border/30" />
          <div className="flex flex-col gap-3 pb-2">
            <div className="h-7 w-48 rounded-sm border-2 border-dashed border-border/30" />
            <div className="h-4 w-36 rounded-sm border-2 border-dashed border-border/30" />
          </div>
        </div>
      </div>

      {/* Classes + Lessons skeleton */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="h-[400px] rounded-md border-2 border-dashed border-border/30 opacity-35" />
        </div>
        <div className="lg:col-span-3">
          <div className="h-[340px] rounded-md border-2 border-dashed border-border/30 opacity-35" />
        </div>
      </div>
    </div>
  );
}

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
  const USERS_BATCH_SIZE = 100;
  // Resolve school from URL slug - don't rely on store timing
  const { data: school, isLoading: schoolLoading } = useSchoolBySlugQuery(
    schoolSlug || null,
    { enabled: !!schoolSlug }
  );
  const schoolId = school?.id;
  const [teacher, setTeacher] = useState<UserWithRolesAndSchools | null>(null);
  const [teacherLookupLoading, setTeacherLookupLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function resolveTeacherBySlug() {
      const normalizedSlug = teacherSlug.toLowerCase().trim();
      if (!schoolId || !normalizedSlug) {
        setTeacher(null);
        setTeacherLookupLoading(false);
        return;
      }

      setTeacherLookupLoading(true);
      setTeacher(null);

      let offset = 0;

      try {
        while (!isCancelled) {
          const result = await meApi.get.listAllUsers({
            schoolId,
            limit: USERS_BATCH_SIZE,
            offset,
          });

          if (isCancelled) return;
          if (result.error || !result.data) break;

          const { users, totalCount } = result.data;
          const matchedTeacher =
            users.find((user) => {
              const firstName = user.firstName || "";
              const lastName = user.lastName || "";
              const fullName = `${firstName} ${lastName}`.trim();
              return nameToSlug(fullName) === normalizedSlug;
            }) ?? null;

          if (matchedTeacher) {
            setTeacher(matchedTeacher);
            return;
          }

          const updatedOffset = offset + users.length;
          const hasMoreUsers = users.length > 0 && updatedOffset < totalCount;
          if (!hasMoreUsers) break;
          offset = updatedOffset;
        }
      } catch (error) {
        console.error("Failed to resolve teacher:", error);
      } finally {
        if (!isCancelled) {
          setTeacherLookupLoading(false);
        }
      }
    }

    void resolveTeacherBySlug();

    return () => {
      isCancelled = true;
    };
  }, [schoolId, teacherSlug]);

  const teacherPositions = useMemo(() => {
    if (!schoolId) return [];
    return (teacher?.schoolPositions ?? [])
      .filter((position) => position.schoolId === schoolId)
      .map((position) => position.position.trim())
      .filter((position) => position.length > 0);
  }, [schoolId, teacher?.schoolPositions]);

  const classesQuery = useUserClasses(teacher?.id ?? null, schoolId ?? null);
  const teacherClasses = classesQuery.data ?? [];

  const lessonsQuery = useLessonsByTeacherAtSchool(
    teacher?.id ?? null,
    schoolId ?? null,
    10
  );
  const lessons: Lesson[] = lessonsQuery.data ?? [];

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
  const isLoadingUsers = isReady && !!schoolId && teacherLookupLoading;
  const isLoadingTeacherData =
    !!teacher &&
    (classesQuery.isLoading || lessonsQuery.isLoading);

  if (!isReady || isWaitingForSchool || isLoadingUsers || isLoadingTeacherData) {
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
    classesPanelMs: 1025,
  } as const;

  const CLASSES_STAGGER = {
    startAfterPanelMs: 220,
    incrementDelaySec: 0.14,
    settleMs: 260,
  } as const;

  const classesPanelDelay = `${TEACHER_BANNER_ANIMATION_DELAYS.classesPanelMs}ms`;
  const classRowsBaseDelaySec =
    (TEACHER_BANNER_ANIMATION_DELAYS.classesPanelMs +
      CLASSES_STAGGER.startAfterPanelMs) /
    1000;
  const lessonsPanelDelayMs =
    TEACHER_BANNER_ANIMATION_DELAYS.classesPanelMs +
    (teacherClasses.length > 0
      ? Math.round(
          (CLASSES_STAGGER.startAfterPanelMs +
            teacherClasses.length * CLASSES_STAGGER.incrementDelaySec * 1000) +
            CLASSES_STAGGER.settleMs
        )
      : 240);
  const lessonsPanelDelay = `${lessonsPanelDelayMs}ms`;

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
        <div className="relative rounded-lg overflow-hidden h-[280px] border-2 border-dashed border-border/25 opacity-35">
          <div className="relative h-full flex items-end gap-6 pt-8 px-8 pb-4">
            <div className="h-[106px] w-[106px] rounded-lg border-2 border-dashed border-border/30 flex-shrink-0" />
            <div className="flex flex-col gap-3 pb-2">
              <div className="h-7 w-48 rounded-sm border-2 border-dashed border-border/30" />
              <div className="h-4 w-36 rounded-sm border-2 border-dashed border-border/30" />
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
                  className="w-auto h-[106px] rounded-lg object-cover"
                />
              ) : (
                <div className="h-[106px] w-[106px] rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
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
                {firstName || lastName ? (
                  <div
                    className="flex items-baseline gap-1.5 flex-wrap min-w-0"
                    style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.45)" }}
                  >
                    <span className="text-3xl font-normal text-white/90">
                      {firstName || "—"}
                    </span>
                    <span className="text-3xl font-black text-white">
                      {lastName || "—"}
                    </span>
                  </div>
                ) : (
                  <div
                    className="text-3xl font-semibold text-white"
                    style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.45)" }}
                  >
                    {fullName || teacher.email}
                  </div>
                )}
                {teacherPositions.length > 0 ? (
                  <div
                    className="text-base font-light text-white/85 mt-1 flex items-center gap-2 flex-wrap capitalize"
                    style={{ textShadow: "0 1px 6px rgba(0, 0, 0, 0.4)" }}
                  >
                    {teacherPositions.map((position, index) => (
                      <span key={`${position}-${index}`} className="inline-flex items-center gap-2">
                        {index > 0 ? (
                          <span aria-hidden className="opacity-50">
                            •
                          </span>
                        ) : null}
                        <span>{position}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
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
        <div
          className="lg:col-span-1 opacity-0 animate-slide-up-fade-in"
          style={{
            animationDelay: classesPanelDelay,
            animationFillMode: "forwards",
          }}
        >
          <div className="mb-4 ml-1">
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              Classes
            </h3>
          </div>
          {teacherClasses.length === 0 ? (
            <div className="h-[400px] rounded-md border-2 border-dashed border-border/35 bg-muted/40 flex items-center justify-center">
              <p className="text-sm text-muted-foreground text-center px-6">
                No classes assigned at this school.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px] pr-2">
              <div className="flex flex-col gap-3">
                {teacherClasses.map((c, index) => (
                  <StaggeredAnimation
                    key={c.classId}
                    index={index}
                    baseDelay={classRowsBaseDelaySec}
                    incrementDelay={CLASSES_STAGGER.incrementDelaySec}
                    fadeDirection="left"
                  >
                    <Link href={`/schools/${schoolSlug}/classes`} className="block">
                      <div className="w-full rounded-md border bg-background/70 py-2.5 px-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
                          <span className="text-sm">{c.className}</span>
                        </div>
                      </div>
                    </Link>
                  </StaggeredAnimation>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Lessons carousel - lessons this teacher owns */}
        <div
          className="lg:col-span-3 opacity-0 animate-slide-up-fade-in"
          style={{
            animationDelay: lessonsPanelDelay,
            animationFillMode: "forwards",
          }}
        >
          <div className="mb-4 flex flex-row items-center justify-between ml-1">
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              Lessons
            </h3>
            {lessons.length > 0 ? (
              <Link
                href={`/schools/${schoolSlug}/lessons`}
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            ) : null}
          </div>
          {lessons.length === 0 ? (
            <div className="h-[340px] rounded-md border-2 border-dashed border-border/35 bg-muted/40 flex items-center justify-center">
              <p className="text-sm text-muted-foreground text-center px-6">
                No lessons for this teacher at this school.
              </p>
            </div>
          ) : (
            <Carousel
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full pb-12"
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
              <CarouselPrevious className="left-1/2 top-auto bottom-0 -translate-y-0 -translate-x-[calc(100%+0.375rem)] z-10" />
              <CarouselNext className="left-1/2 right-auto top-auto bottom-0 -translate-y-0 translate-x-[0.375rem] z-10" />
            </Carousel>
          )}
        </div>
      </div>
    </div>
  );
}

