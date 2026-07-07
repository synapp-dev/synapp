"use client";

import { useQuery } from "@tanstack/react-query";
import { useMeStore } from "@/entities/me/model/store";
import { useSchoolStore } from "@/stores/school-store";
import { apiFetch } from "@/lib/api/fetcher.client";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import Link from "next/link";
import { useMemo } from "react";
import Image from "next/image";
import { BookOpen, GraduationCap, Lock, Presentation, School, Star } from "lucide-react";
import { LessonCard, type Lesson } from "@/entities/lessons/ui/lesson-card";
import { StartNewLessonCard } from "@/entities/lessons/ui/start-new-lesson-card";
import { useLessons } from "@/entities/lessons/model/store";
import type { LessonWithDetails } from "@/entities/lessons/model/store";
import { useMySchoolsQuery, useSchoolsForUserQuery } from "@/entities/me/model/useMySchoolsQuery";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { certificationApi } from "@/entities/certification/api/endpoints";
import { useCertificationTopicsByCourseCode } from "@/entities/certification/model/topics-store";
import { TopicCertificate } from "@/components/molecules/topic-certificate";
import CountUp from "react-countup";
import { cn } from "@workspace/ui/lib/utils";
import { useEffectiveUser } from "@/hooks/use-effective-user";

type UserClass = {
  classId: string;
  className: string;
  classCode: string | null;
  schoolId: string;
  schoolSlug: string | null;
  schoolName: string | null;
  active: boolean;
  createdAt: string;
};

const MyClassesCard = ({ className }: { className?: string }) => {
  const currentUser = useEffectiveUser();
  const activeSchool = useSchoolStore((state) => state.getActiveSchool());

  const { data, isLoading, isError } = useQuery<UserClass[]>({
    queryKey: ["user-classes", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const result = await apiFetch<UserClass[]>(
        `/users/${currentUser.id}/classes`
      );
      if (result.error) {
        console.error("Failed to fetch user classes:", result.error);
        return [];
      }
      return result.data || [];
    },
    enabled: !!currentUser?.id,
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className={cn("flex flex-col h-full max-h-[500px] gap-3 overflow-auto", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/60 uppercase shrink-0">
        <GraduationCap className="h-4 w-4 shrink-0" />
        My classes
      </div>
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      )}
      {!isLoading && isError && (
        <p className="text-sm text-muted-foreground">Failed to load classes</p>
      )}
      {!isLoading && !isError && (!data || data.length === 0) && (
        <Link
          href={
            activeSchool?.slug
              ? `/schools/${activeSchool.slug}/classes`
              : "/schools"
          }
          className="flex w-full border-2 border-dotted border-muted-foreground/30 rounded-2xl py-3 px-3 items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
        >
          <Star className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          <span className="text-sm text-muted-foreground">Add your classes</span>
        </Link>
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.slice(0, 4).map((c) => {
            const href = c.schoolSlug
              ? `/schools/${c.schoolSlug}/classes`
              : "/schools";
            return (
              <Link key={c.classId} href={href} className="block">
                <Card className="py-2.5 px-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
                    <span className="text-sm">{c.className}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
          {data.length > 4 && (
            <Link
              href={
                activeSchool?.slug
                  ? `/schools/${activeSchool.slug}/classes`
                  : "/schools"
              }
              className="block"
            >
              <Card className="py-2.5 px-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">
                    and {data.length - 4} more
                  </span>
                </div>
              </Card>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

// Priority order for lesson status: feedback > in_progress > ready > preparing
const LESSON_STATUS_PRIORITY: Record<string, number> = {
  feedback: 0,
  in_progress: 1,
  ready: 2,
  preparing: 3,
};

function getTopLesson(lessons: LessonWithDetails[], currentUserId: string | undefined): LessonWithDetails | null {
  const active = lessons.filter(
    (l) =>
      l.status &&
      l.status !== "cancelled" &&
      l.status !== "completed" &&
      l.createdByUserId === currentUserId
  );
  if (active.length === 0) return null;
  active.sort((a, b) => {
    const prioA = LESSON_STATUS_PRIORITY[a.status!] ?? 999;
    const prioB = LESSON_STATUS_PRIORITY[b.status!] ?? 999;
    return prioA - prioB;
  });
  return active[0];
}

const MyLessonsCard = ({ className }: { className?: string }) => {
  const currentUser = useEffectiveUser();
  const viewAsUser = useMeStore((s) => s.viewAsUser);
  const { data: mySchools = [] } = useMySchoolsQuery({ limit: 50 });
  const { data: viewAsSchools = [] } = useSchoolsForUserQuery(viewAsUser?.id ?? "", {
    limit: 100,
  });
  const schools = viewAsUser ? viewAsSchools : mySchools;
  const schoolIdToSlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of schools) {
      if (s.id && s.slug) m.set(s.id, s.slug);
    }
    return m;
  }, [schools]);

  const { lessons, isLoading, isError } = useLessons({
    teacherId: currentUser?.id,
    limit: 100,
  });

  const topLesson = useMemo(
    () => getTopLesson(lessons, currentUser?.id),
    [lessons, currentUser?.id]
  );
  const schoolSlug = topLesson?.schoolId ? schoolIdToSlug.get(topLesson.schoolId) : null;
  const firstSchoolWithLessons = schools[0];

  return (
    <div className={cn("flex flex-col h-full max-h-[500px] gap-4 overflow-auto", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/60 uppercase shrink-0">
        <Presentation className="h-4 w-4 shrink-0" />
        My lessons
      </div>
      {isLoading && (
        <Skeleton className="h-32 w-full rounded-lg shrink-0" />
      )}
      {!isLoading && isError && (
        <p className="text-sm text-muted-foreground">Failed to load lessons</p>
      )}
      {!isLoading && !isError && !topLesson && (
        <StartNewLessonCard
          href={
            firstSchoolWithLessons?.slug
              ? `/schools/${firstSchoolWithLessons.slug}/lessons?dialog=add-new-lesson`
              : "/schools"
          }
        />
      )}
      {!isLoading && !isError && topLesson && (schoolSlug || firstSchoolWithLessons?.slug) && (
        <LessonCard
          lesson={topLesson as Lesson}
          schoolSlug={schoolSlug ?? firstSchoolWithLessons!.slug}
        />
      )}
      {!isLoading && !isError && topLesson && !schoolSlug && !firstSchoolWithLessons?.slug && (
        <StartNewLessonCard href="/schools" />
      )}
    </div>
  );
};

function SchoolHeaderCard() {
  const activeSchool = useSchoolStore((s) => s.getActiveSchool());
  const banner = useStorageImageUrl(activeSchool?.bannerUrl ?? null);
  const avatar = useStorageImageUrl(activeSchool?.avatarUrl ?? null);
  const headerReady = !(!!activeSchool?.bannerUrl && banner.loading) && !(!!activeSchool?.avatarUrl && avatar.loading);

  if (!activeSchool) {
    return (
      <Link
        href="/schools"
        className="block h-full relative rounded-lg overflow-hidden min-h-[140px] bg-muted hover:bg-muted/80 transition-colors"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent opacity-60" />
        <div className="relative h-full flex items-center justify-center gap-3 p-4">
          <School className="h-8 w-8 text-white/90" />
          <span className="text-lg font-medium text-white">Select a school</span>
        </div>
      </Link>
    );
  }

  if (!headerReady) {
    return (
      <div className="relative rounded-lg overflow-hidden h-full min-h-[140px] bg-muted">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent opacity-60" />
        <div className="relative h-full flex items-end gap-3 p-4">
          <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
          <div className="flex flex-col gap-1 mb-0.5">
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/schools/${activeSchool.slug}/home`} className="block h-full min-h-0">
      <div className="relative rounded-lg overflow-hidden h-full min-h-[140px] bg-[var(--brand-bullyproof-primary)]">
        {banner.url && (
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${banner.url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-hidden
            />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to top, var(--brand-bullyproof-primary) 0%, color-mix(in srgb, var(--brand-bullyproof-primary) 75%, transparent) 50%, transparent 100%)`,
          }}
          aria-hidden
        />
        <div className="relative h-full flex items-center gap-3 p-4">
          {avatar.url ? (
            <Image
              src={avatar.url}
              alt={activeSchool.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 bg-white/20">
              <Image src="/images/bp-small-logo.svg" alt="" width={20} height={20} className="object-contain opacity-90" />
            </div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0 flex-1 justify-center">
            <h2 className="text-lg font-semibold text-white truncate">{activeSchool.name}</h2>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CompletedLessonsCard() {
  const currentUser = useEffectiveUser();
  const activeSchool = useSchoolStore((s) => s.getActiveSchool());
  const { lessons, isLoading } = useLessons({ teacherId: currentUser?.id, limit: 100 });
  const completedCount = useMemo(
    () => lessons.filter((l) => l.status === "completed").length,
    [lessons]
  );

  const href = activeSchool?.slug ? `/schools/${activeSchool.slug}/lessons` : undefined;

  const cardContent = (
    <Card className="h-full py-1 px-0 transition-all shadow hover:shadow-md hover:border-primary/50">
      <CardContent className="flex flex-col items-stretch gap-3 pt-4 pb-4 px-6 text-left">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <BookOpen className="h-5 w-5 shrink-0" />
          Completed Lessons
        </p>
        <span className="text-5xl font-bold tabular-nums block text-right text-primary/75">
          {isLoading ? "—" : <CountUp start={0} end={completedCount} duration={1} />}
        </span>
        <p className="text-sm text-muted-foreground">Your lessons completed</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block h-full">{cardContent}</Link>;
  }
  return cardContent;
}

function APCertificationCard() {
  const currentUser = useEffectiveUser();

  const { data: course } = useQuery({
    queryKey: ["certification-course", "amayda-program"],
    queryFn: async () => {
      const result = await certificationApi.courses.bySlug("amayda-program");
      if (result.error || !result.data) return null;
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: progressData } = useQuery({
    queryKey: ["certification-progress", course?.code],
    queryFn: async () => {
      if (!course?.code) return { progress: [] };
      const result = await certificationApi.courses.progress.byCode(course.code);
      if (result.error) return { progress: [] };
      return result.data ?? { progress: [] };
    },
    enabled: !!course?.code,
    staleTime: 2 * 60 * 1000,
  });

  const { topics: topicsList = [], isLoading: isLoadingTopics } = useCertificationTopicsByCourseCode(course?.code ?? null, {
    includeSlides: false,
    includeUrls: false,
  });

  const { isCertificationComplete, lastCompletedTopicDate } = useMemo(() => {
    const progress = progressData?.progress ?? [];
    const completedTopics = progress.filter(
      (p: { status?: string }) => p.status === "completed" || p.status === "passed"
    ).length;
    const totalTopics = topicsList.length;
    const complete = completedTopics === totalTopics && totalTopics > 0;
    const completedWithDate = progress.filter(
      (p: { status?: string; completedAt?: string }) =>
        (p.status === "completed" || p.status === "passed") && p.completedAt
    );
    const sorted = [...completedWithDate].sort((a: { completedAt?: string }, b: { completedAt?: string }) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });
    const lastDate = sorted[0]?.completedAt ?? null;
    return { isCertificationComplete: complete, lastCompletedTopicDate: lastDate };
  }, [progressData?.progress, topicsList.length]);

  const isLoading = !course || isLoadingTopics;
  const progressCount = (progressData?.progress ?? []).filter(
    (p: { status?: string }) => p.status === "completed" || p.status === "passed"
  ).length;

  if (isLoading) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex items-center justify-center py-12">
          <Skeleton className="h-24 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isCertificationComplete && currentUser && lastCompletedTopicDate) {
    return (
      <TopicCertificate
        user={currentUser}
        completedAt={lastCompletedTopicDate}
        compact
        courseId={course?.id}
      />
    );
  }

  const totalTopics = topicsList.length;

  return (
    <Link href="/courses/amayda-program" className="block">
      <Card className="border-2 border-dashed hover:border-primary/30 hover:bg-muted/30 transition-colors">
        <CardContent className="flex flex-col items-center justify-center py-8 px-6 gap-2 text-center">
          {progressCount > 0 && totalTopics > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {progressCount} of {totalTopics} topics completed
              </p>
              <p className="text-base font-medium">Continue your AP Certification</p>
            </>
          ) : (
            <>
              <p className="text-base font-medium">Get AP Certified</p>
              <p className="text-sm text-muted-foreground">Complete the Amayda Program</p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function RecentActivitySection({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 h-full max-h-[500px] min-h-0 overflow-hidden", className)}>
      <div className="grid grid-cols-2 gap-4 grid-rows-1 items-stretch min-h-0 flex-1">
        <SchoolHeaderCard />
        <CompletedLessonsCard />
      </div>
      <div className="flex-1 min-h-0">
        <APCertificationCard />
      </div>
    </div>
  );
}

const LockedCard = ({ 
  label, 
  className,
  skeletonVariant = 1
}: { 
  label: string; 
  className?: string;
  skeletonVariant?: number;
}) => {
  // Different skeleton patterns for each card - Kanban style
  const renderSkeleton = () => {
    switch (skeletonVariant) {
      case 1: // My classes - 1 column Kanban
        return (
          <div className="opacity-30 blur-[0.5px] h-full flex gap-1 group-hover:blur-[1px] transition-all duration-300">
            {/* Column 1 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
          </div>
        );
      case 2: // My lessons - 2 column Kanban
        return (
          <div className="opacity-30 blur-[0.5px] h-full flex gap-1 group-hover:blur-[1px] transition-all duration-300">
            {/* Column 1 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
            {/* Column 2 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
          </div>
        );
      case 3: // Recent activity - 3 column Kanban
        return (
          <div className="opacity-30 blur-[0.5px] h-full flex gap-1 group-hover:blur-[1px] transition-all duration-300">
            {/* Column 1 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
            {/* Column 2 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
            {/* Column 3 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn("group relative h-full max-h-[500px] cursor-not-allowed border-dashed bg-gradient-to-b from-muted to-transparent", className)}>
          <div className="absolute top-4 left-4 text-xs font-medium text-muted-foreground/60 z-10 uppercase blur-[0.5px]">
            {label}
          </div>
          {/* Top right lock icon - disappears on hover */}
          <div className="absolute top-4 right-4 z-20 group-hover:opacity-0 transition-opacity duration-300">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          {/* Center lock icon - appears on hover */}
          <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Lock className="h-24 w-24 text-muted-foreground transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300" />
          </div>
          <CardContent className="pt-12 pb-2 px-2 relative h-full">
            {renderSkeleton()}
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>Unlocks in Term 1!</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const TeacherOverviewSection = () => {
  return (
    <div className="grid grid-cols-10 gap-4">
      <MyClassesCard className="col-span-2 max-h-[500px]" />
      <MyLessonsCard className="col-span-3 max-h-[500px]" />
      <RecentActivitySection className="col-span-5 max-h-[500px]" />
    </div>
  );
}