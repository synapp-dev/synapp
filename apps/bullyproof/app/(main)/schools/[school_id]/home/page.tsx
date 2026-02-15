"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSchoolStore } from "@/stores/school-store";
import { useFeaturesAccess } from "@/hooks/use-features-access";
import {
  useSchoolStatsQuery,
  useSchoolKeyStaffQuery,
} from "@/entities/school/model/useListSchoolsQuery";
import { useLessons } from "@/entities/lessons/model/store";
import { LessonCard, type Lesson } from "@/entities/lessons/ui/lesson-card";
import { StartNewLessonCard } from "@/entities/lessons/ui/start-new-lesson-card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Image from "next/image";
import Link from "next/link";
import {
  Users,
  CalendarDays,
  Award,
  GraduationCap,
  Settings,
  Presentation,
  BookOpenText,
  LibraryBig,
  TrendingUp,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { SchoolInfoCard } from "@/components/molecules/school-info-card";
import { Separator } from "@workspace/ui/components/separator";

const HOME_NAV_ITEMS: {
  title: string;
  href: (slug: string) => string;
  feature: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Teachers",
    href: (s) => `/schools/${s}/teachers`,
    feature: "/school/teachers",
    icon: Users,
  },
  {
    title: "Classes",
    href: (s) => `/schools/${s}/classes`,
    feature: "/school/classes",
    icon: GraduationCap,
  },
  {
    title: "Lessons",
    href: (s) => `/schools/${s}/lessons`,
    feature: "/school/lessons",
    icon: Presentation,
  },
  {
    title: "Content",
    href: (s) => `/schools/${s}/content`,
    feature: "/school/content",
    icon: BookOpenText,
  },
  {
    title: "Resources",
    href: (s) => `/schools/${s}/resources`,
    feature: "/school/resources",
    icon: LibraryBig,
  },
  {
    title: "Performance",
    href: (s) => `/schools/${s}/performance`,
    feature: "/school/performance",
    icon: TrendingUp,
  },
  {
    title: "Reports",
    href: (s) => `/schools/${s}/reports`,
    feature: "/school/reports",
    icon: FileText,
  },
  {
    title: "Settings",
    href: (s) => `/schools/${s}/settings`,
    feature: "/settings",
    icon: Settings,
  },
];

/** Group order: Teachers+Classes | Lessons+Content+Resources | Performance+Reports+Settings */
const NAV_GROUP_FEATURES = [
  ["/school/teachers", "/school/classes"],
  ["/school/lessons", "/school/content", "/school/resources"],
  ["/school/performance", "/school/reports", "/settings"],
];

type SchoolHeaderBannerProps = {
  school: { name: string; bannerUrl?: string | null; avatarUrl?: string | null };
  stateText: string;
  sectorText: string;
  levelsText: string;
  /** Resolved signed URLs - when provided, used directly (no fetching) */
  bannerUrl?: string | null;
  avatarUrl?: string | null;
};

const ANIMATION_DELAYS = {
  card: "0ms",
  banner: "150ms",
  gradient: "400ms",
  avatar: "900ms",
  name: "1050ms",
  metadata: "1200ms",
  nav: "1400ms",
  rest: "1700ms",
} as const;

const CARD_STAGGER_MS = 120;
const CARD_ANIMATION_DURATION_S = 0.3;

function SchoolHomeStatsPanel({ schoolSlug }: { schoolSlug: string }) {
  const { data: stats, isLoading } = useSchoolStatsQuery(
    schoolSlug || null,
    { enabled: !!schoolSlug }
  );
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SchoolInfoCard
          icon={CalendarDays}
          title="Days in the program"
          value={0}
          description=""
          isLoading
        />
        <SchoolInfoCard
          icon={Award}
          title="AP Teachers"
          value={0}
          description=""
          isLoading
        />
        <SchoolInfoCard
          icon={GraduationCap}
          title="Classes"
          value={0}
          description=""
          isLoading
        />
        <SchoolInfoCard
          icon={Presentation}
          title="Lessons Completed"
          value={0}
          description=""
          isLoading
        />
      </div>
    );
  }
  const daysBullyProof = stats?.daysBullyProof ?? 0;
  const startDate = stats?.startDate ?? null;
  const teacherCount = stats?.teacherCount ?? 0;
  const totalStaff = stats?.totalStaff ?? 0;
  const classCount = stats?.classCount ?? 0;
  const completedLessonCount = stats?.completedLessonCount ?? 0;

  const apTeacherPercent =
    totalStaff > 0 ? Math.round((teacherCount / totalStaff) * 100) : 0;
  const formattedStartDate = startDate
    ? new Date(startDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : null;

  const restMs = 1700;
  const cardAnimMs = CARD_ANIMATION_DURATION_S * 1000;
  const cardDelays = [0, 1, 2, 3].map((i) => restMs + i * CARD_STAGGER_MS);
  // Number starts towards end of card slide - overlap for slick feel
  const numberDelayOffsetMs = cardAnimMs * 0.6;
  const numberDelays = [0, 1, 2, 3].map(
    (i) => restMs + i * CARD_STAGGER_MS + numberDelayOffsetMs
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SchoolInfoCard
        icon={CalendarDays}
        title="Days in Program"
        value={daysBullyProof}
        description={formattedStartDate ?? "—"}
        countUpDuration={1.5}
        cardAnimationDelayMs={cardDelays[0]}
        numberAnimationDelayMs={numberDelays[0]}
      />
      <Link
        href={`/schools/${schoolSlug}/teachers`}
        className="block h-full"
      >
        <SchoolInfoCard
          icon={Award}
          title="AP Teachers"
          value={teacherCount}
          description={`${apTeacherPercent}% of staff`}
          cardAnimationDelayMs={cardDelays[1]}
          numberAnimationDelayMs={numberDelays[1]}
        />
      </Link>
      <Link
        href={`/schools/${schoolSlug}/classes`}
        className="block h-full"
      >
        <SchoolInfoCard
          icon={GraduationCap}
          title="Classes"
          value={classCount}
          description="In your school"
          cardAnimationDelayMs={cardDelays[2]}
          numberAnimationDelayMs={numberDelays[2]}
        />
      </Link>
      <Link
        href={`/schools/${schoolSlug}/lessons`}
        className="block h-full"
      >
        <SchoolInfoCard
          icon={Presentation}
          title="Lessons Completed"
          value={completedLessonCount}
          description="This school year"
          cardAnimationDelayMs={cardDelays[3]}
          numberAnimationDelayMs={numberDelays[3]}
        />
      </Link>
    </div>
  );
}

function SchoolHomeLessonsCarousel({ schoolSlug }: { schoolSlug: string }) {
  const { lessons, isLoading } = useLessons({
    schoolId: schoolSlug || undefined,
    limit: 9,
  });
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Skeleton className="h-40 w-64 shrink-0" />
            <Skeleton className="h-40 w-64 shrink-0" />
            <Skeleton className="h-40 w-64 shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Lessons</CardTitle>
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
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            <CarouselItem
              className="pl-2 basis-[min(300px,90vw)] md:basis-[320px]"
            >
              <StartNewLessonCard
                href={`/schools/${schoolSlug}/lessons?dialog=add-new-lesson`}
              />
            </CarouselItem>
            {lessons.map((lesson) => (
              <CarouselItem
                key={lesson.id}
                className="pl-2 basis-[min(300px,90vw)] md:basis-[320px]"
              >
                <LessonCard
                  lesson={lesson as Lesson}
                  schoolSlug={schoolSlug}
                  displayOnly={false}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4" />
          <CarouselNext className="-right-4" />
        </Carousel>
      </CardContent>
    </Card>
  );
}

function SchoolHomeKeyStaff({ schoolSlug }: { schoolSlug: string }) {
  const { data: keyStaff, isLoading } = useSchoolKeyStaffQuery(
    schoolSlug || null,
    { enabled: !!schoolSlug }
  );

  const StaffItem = ({
    member,
    position,
  }: {
    member: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null };
    position?: string;
  }) => {
    const name = [member.firstName, member.lastName].filter(Boolean).join(" ") || "Unknown";
    const teacherSlug = encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"));
    const { url: avatarUrl } = useStorageImageUrl(member.avatarUrl ?? null);
    return (
      <Link
        href={`/schools/${schoolSlug}/teachers/${teacherSlug}`}
        className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
      >
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={40}
              height={40}
              className="h-10 w-10 object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{name}</p>
          {position && (
            <p className="text-xs text-muted-foreground truncate">{position}</p>
          )}
        </div>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Key Staff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const admins = keyStaff?.admins ?? [];
  const apStaff = keyStaff?.apStaff ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Key Staff</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {admins.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              School Admins
            </p>
            <div className="space-y-1">
              {admins.map((a) => (
                <StaffItem key={a.id} member={a} />
              ))}
            </div>
          </div>
        )}
        {apStaff.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              AP & Leadership
            </p>
            <div className="space-y-1">
              {apStaff.map((a) => (
                <StaffItem
                  key={a.id}
                  member={a}
                  position={a.positions[0] ?? undefined}
                />
              ))}
            </div>
          </div>
        )}
        {admins.length === 0 && apStaff.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No key staff listed yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SchoolHeaderBanner({
  school,
  stateText,
  sectorText,
  levelsText,
  bannerUrl,
  avatarUrl,
}: SchoolHeaderBannerProps) {
  const metadataParts = [stateText, sectorText, levelsText].filter(Boolean);
  const DotSeparator = () => (
    <span className="w-0.5 h-0.5 rounded-full bg-white/90 flex-shrink-0" />
  );

  const AvatarPlaceholder = () => (
    <div className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
      <Image
        src="/images/bp-small-logo.svg"
        alt=""
        width={56}
        height={56}
        className="w-12 h-12 object-contain opacity-90"
      />
    </div>
  );

  return (
    <div
      className={`relative rounded-lg overflow-hidden h-[360px] opacity-0 animate-slide-down-fade-in ${bannerUrl ? "bg-transparent" : "bg-[var(--brand-bullyproof-primary)]"}`}
      style={{
        animationDelay: ANIMATION_DELAYS.card,
        animationFillMode: "forwards",
      }}
    >
      {/* Banner image layer - fades in and slides up into place */}
      {bannerUrl && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-0 [animation:var(--animate-banner-reveal)]"
            style={{
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              animationDelay: ANIMATION_DELAYS.banner,
              animationFillMode: "forwards",
            }}
            aria-hidden
          />
        </div>
      )}
      {/* Gradient overlay - slides up from bottom, after banner, before avatar */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent opacity-0 [animation:var(--animate-slide-up-from-bottom)]"
        style={{
          animationDelay: ANIMATION_DELAYS.gradient,
          animationFillMode: "forwards",
        }}
        aria-hidden
      />
      <div className="relative h-full flex items-end gap-4 p-6">
        {/* Avatar on the left */}
        <div
          className="flex-shrink-0 opacity-0 animate-slide-up-fade-in"
          style={{
            animationDelay: ANIMATION_DELAYS.avatar,
            animationFillMode: "forwards",
          }}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={school.name}
              width={600}
              height={600}
              className="w-auto h-20 rounded-lg object-cover"
            />
          ) : (
            <AvatarPlaceholder />
          )}
        </div>
        {/* Info: metadata above school name */}
        <div className="flex flex-col gap-0.5 pb-0.5 min-w-0 flex-1">
          {metadataParts.length > 0 && (
            <div
              className="flex items-center gap-1.5 text-sm font-medium text-white/90 opacity-0 animate-slide-down-fade-in"
              style={{
                animationDelay: ANIMATION_DELAYS.metadata,
                animationFillMode: "forwards",
              }}
            >
              {metadataParts.map((part, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  {index > 0 && <DotSeparator />}
                  <span className="capitalize">{part}</span>
                </div>
              ))}
            </div>
          )}
          <h1
            className="text-3xl md:text-6xl font-bold text-white opacity-0 animate-slide-left-fade-in"
            style={{
              animationDelay: ANIMATION_DELAYS.name,
              animationFillMode: "forwards",
            }}
          >
            {school.name}
          </h1>
        </div>
      </div>
    </div>
  );
}

function SchoolHomeHeroSection({
  school,
  stateText,
  sectorText,
  levelsText,
}: SchoolHeaderBannerProps) {
  const banner = useStorageImageUrl(school.bannerUrl ?? null);
  const avatar = useStorageImageUrl(school.avatarUrl ?? null);
  const bannerLoading = !!school.bannerUrl && banner.loading;
  const avatarLoading = !!school.avatarUrl && avatar.loading;
  const ready = !bannerLoading && !avatarLoading;

  if (!ready) {
    return (
      <div className="relative rounded-lg overflow-hidden h-[360px] bg-muted">
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent opacity-60"
          aria-hidden
        />
        <div className="relative h-full flex items-end gap-4 p-6">
          <Skeleton className="h-20 w-20 rounded-lg flex-shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <SchoolHeaderBanner
      school={school}
      stateText={stateText}
      sectorText={sectorText}
      levelsText={levelsText}
      bannerUrl={banner.url}
      avatarUrl={avatar.url}
    />
  );
}

export default function HomePage() {
  const { school_id: schoolSlug } = useParams<{ school_id: string }>();
  const slug = schoolSlug ?? "";
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const schoolIdForFeatures = currentSchool?.id;
  const featureKeys = useMemo(
    () => HOME_NAV_ITEMS.map((item) => item.feature),
    []
  );
  const featuresAccess = useFeaturesAccess(featureKeys, schoolIdForFeatures);

  const visibleNavItems = useMemo(() => {
    return HOME_NAV_ITEMS.filter((item) => {
      const access = featuresAccess[item.feature];
      return access?.visible ?? false;
    });
  }, [featuresAccess]);

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

  if (!currentSchool) {
    return (
      <>
        <FeatureGuard feature="/school/home" schoolId={undefined} />
        <div className="space-y-8">
          {/* Hero Section Skeleton */}
          <div className="relative rounded-lg overflow-hidden h-[280px] bg-muted">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent" />
            <div className="relative h-full flex items-end gap-4 p-6">
              <div className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                <Image
                  src="/images/bp-small-logo.svg"
                  alt=""
                  width={56}
                  height={56}
                  className="w-12 h-12 object-contain opacity-90"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-64" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { stateText, sectorText, levelsText } = getSchoolMetadata();

  return (
    <>
      <FeatureGuard feature="/school/home" schoolId={currentSchool?.id} />
      <div className="space-y-4">
        {/* Hero Section - skeleton until avatar/banner resolved, then staggered animations */}
        {currentSchool && (
          <SchoolHomeHeroSection
            school={currentSchool}
            stateText={stateText}
            sectorText={sectorText}
            levelsText={levelsText}
          />
        )}

        {/* Nav - slides out from underneath header after hero has loaded */}
        {visibleNavItems.length > 0 && (
          <div
            className="opacity-0 animate-slide-down-fade-in"
            style={{
              animationDelay: ANIMATION_DELAYS.nav,
              animationFillMode: "forwards",
            }}
          >
            <ButtonGroup className="flex w-full flex-wrap gap-x-8 gap-y-2">
            {NAV_GROUP_FEATURES.map((groupFeatures, groupIdx) => {
              const itemsInGroup = groupFeatures
                .map((f) => visibleNavItems.find((i) => i.feature === f))
                .filter(Boolean) as typeof visibleNavItems;
              if (itemsInGroup.length === 0) return null;

              return (
                <ButtonGroup
                  key={groupIdx}
                  className={groupIdx === 2 ? "ml-auto" : undefined}
                >
                  {itemsInGroup.map((item) => {
                    const access = featuresAccess[item.feature];
                    const hasAccess = access?.hasAccess ?? false;
                    const isLocked = access?.visible && !hasAccess;
                    const Icon = item.icon;

                    if (isLocked) {
                      return (
                        <Button
                          key={item.feature}
                          variant="outline"
                          size="default"
                          disabled
                          className="cursor-not-allowed opacity-60"
                        >
                          <Icon className="size-4" />
                          {item.title}
                        </Button>
                      );
                    }

                    return (
                      <Button
                        key={item.feature}
                        variant="outline"
                        size="default"
                        asChild
                      >
                        <Link
                          href={item.href(
                            currentSchool?.slug ?? slug
                          )}
                          className="flex items-center gap-2"
                        >
                          <Icon className="size-4" />
                          {item.title}
                        </Link>
                      </Button>
                    );
                  })}
                </ButtonGroup>
              );
            })}
            </ButtonGroup>
          </div>
        )}

<div className="flex justify-center w-1/4 mx-auto">
  <Separator className="my-4 w-full" />
</div>

        {/* Stats + content - slide up from bottom after nav */}
        <div
          className="space-y-6 opacity-0 animate-slide-up-fade-in"
          style={{
            animationDelay: ANIMATION_DELAYS.rest,
            animationFillMode: "forwards",
          }}
        >
          <SchoolHomeStatsPanel schoolSlug={slug} />

          {/* Content row: 2/3 carousel + 1/3 key staff */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SchoolHomeLessonsCarousel schoolSlug={slug} />
          </div>
          <div className="lg:col-span-1">
            <SchoolHomeKeyStaff schoolSlug={slug} />
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
