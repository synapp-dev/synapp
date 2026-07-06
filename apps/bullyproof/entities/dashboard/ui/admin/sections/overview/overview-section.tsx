import { SnapshotCardWithData } from "@/entities/dashboard/ui/admin/cards/snapshot-card-with-data";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import { Book, FileText, Shield, Star, Users } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import Image from "next/image";
import { cn } from "@workspace/ui/lib/utils";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";

const JOIN_CARD_ANIMATION_DELAYS = {
  card: "0ms",
  banner: "150ms",
  gradient: "400ms",
  avatar: "900ms",
  title: "1050ms",
} as const;
const SCHOOL_ROTATION_MS = 8000;
const SCHOOL_ROTATION_TICK_MS = 50;

function isStoragePath(urlOrPath: string | null | undefined): boolean {
  if (!urlOrPath || typeof urlOrPath !== "string") return false;
  return !urlOrPath.startsWith("http") && urlOrPath.startsWith("schools/");
}

function preloadImage(url: string | null | undefined): Promise<void> {
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

function QuickActionsCard({
  title,
  icon,
  link,
  disabled,
}: {
  title: string;
  icon: React.ReactNode;
  link: string;
  disabled?: boolean;
}) {
  const words = title.split(" ");
  const firstWord = words[0] || "";
  const secondWord = words.slice(1).join(" ");

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer p-0 flex-1 flex",
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      )}
    >
      <Link
        href={disabled ? "#" : link}
        className="w-full h-full flex items-center gap-1 p-2"
      >
        <div className="p-1 rounded flex-shrink-0">{icon}</div>
        <span className="text-sm">
          <span className="font-light">{firstWord}</span>
          {secondWord && (
            <>
              {" "}
              <span className="font-medium">{secondWord}</span>
            </>
          )}
        </span>
      </Link>
    </Card>
  );
}

export function OverviewSection() {
  const queryClient = useQueryClient();
  const { data: latestSchoolsData, isLoading: latestSchoolsLoading } =
    useListSchoolsQuery({
      limit: 5,
      sort: "latest",
    });
  const latestSchools = useMemo(
    () => (latestSchoolsData ?? []).slice(0, 5),
    [latestSchoolsData]
  );
  const [activeSchoolIndex, setActiveSchoolIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [displaySchoolId, setDisplaySchoolId] = useState<string | null>(null);
  const [readySchoolIds, setReadySchoolIds] = useState<Set<string>>(new Set());
  const [schoolMediaById, setSchoolMediaById] = useState<
    Record<string, { bannerUrl: string | null; avatarUrl: string | null }>
  >({});
  const activeSchool = latestSchools[activeSchoolIndex] ?? null;
  const schoolsById = useMemo(
    () => new Map(latestSchools.map((school) => [school.id, school])),
    [latestSchools]
  );

  useEffect(() => {
    setActiveSchoolIndex(0);
    setElapsedMs(0);
    setDisplaySchoolId(null);
  }, [latestSchools.length]);

  useEffect(() => {
    let cancelled = false;
    setReadySchoolIds(new Set());
    setSchoolMediaById({});

    async function resolveMediaUrl(urlOrPath: string | null | undefined) {
      if (!urlOrPath || urlOrPath.trim() === "") return null;
      if (!isStoragePath(urlOrPath)) return urlOrPath;
      const signedUrl = await queryClient.fetchQuery({
        queryKey: ["storage", "signedUrl", urlOrPath],
        queryFn: async () => {
          const result = await apiFetch<{ url: string }>(
            `/storage/signed-url?path=${encodeURIComponent(urlOrPath)}`
          );
          if (result.error) {
            throw new Error(result.error.message ?? "Failed to load image");
          }
          const resolvedUrl = result.data?.url;
          if (!resolvedUrl || !resolvedUrl.startsWith("http")) {
            throw new Error("Failed to load image");
          }
          return resolvedUrl;
        },
        staleTime: 45 * 60 * 1000,
      });
      return signedUrl ?? null;
    }

    latestSchools.forEach((school) => {
      void (async () => {
        const [resolvedBannerUrl, resolvedAvatarUrl] = await Promise.all([
          resolveMediaUrl(school.bannerUrl ?? null),
          resolveMediaUrl(school.avatarUrl ?? null),
        ]);
        await Promise.all([
          preloadImage(resolvedBannerUrl),
          preloadImage(resolvedAvatarUrl),
        ]);
        if (cancelled) return;

        setSchoolMediaById((previous) => ({
          ...previous,
          [school.id]: {
            bannerUrl: resolvedBannerUrl,
            avatarUrl: resolvedAvatarUrl,
          },
        }));
        setReadySchoolIds((previous) => {
          const next = new Set(previous);
          next.add(school.id);
          return next;
        });
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [latestSchools, queryClient]);

  useEffect(() => {
    if (isCardHovered) return;
    if (latestSchools.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setElapsedMs((previousElapsedMs) => {
        const nextElapsedMs = previousElapsedMs + SCHOOL_ROTATION_TICK_MS;
        if (nextElapsedMs >= SCHOOL_ROTATION_MS) {
          setActiveSchoolIndex((previousIndex) => {
            const nextIndex = (previousIndex + 1) % latestSchools.length;
            const nextSchool = latestSchools[nextIndex];
            if (!nextSchool || !readySchoolIds.has(nextSchool.id)) {
              return previousIndex;
            }
            return nextIndex;
          });
          return 0;
        }
        return nextElapsedMs;
      });
    }, SCHOOL_ROTATION_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [latestSchools, readySchoolIds, isCardHovered]);

  useEffect(() => {
    if (!activeSchool || !readySchoolIds.has(activeSchool.id)) return;
    if (!displaySchoolId) {
      setDisplaySchoolId(activeSchool.id);
      return;
    }
    if (displaySchoolId !== activeSchool.id) {
      setDisplaySchoolId(activeSchool.id);
    }
  }, [activeSchool, displaySchoolId, readySchoolIds]);

  useEffect(() => {
    if (displaySchoolId && !schoolsById.has(displaySchoolId)) {
      setDisplaySchoolId(null);
    }
  }, [displaySchoolId, schoolsById]);

  const displaySchool = displaySchoolId
    ? (schoolsById.get(displaySchoolId) ?? null)
    : null;
  const activeSchoolMedia = displaySchool ? schoolMediaById[displaySchool.id] : null;
  const bannerUrl = activeSchoolMedia?.bannerUrl ?? null;
  const avatarUrl = activeSchoolMedia?.avatarUrl ?? null;
  const firstSchool = latestSchools[0] ?? null;
  const firstSchoolReady = firstSchool ? readySchoolIds.has(firstSchool.id) : false;
  const cardReady = !!displaySchool && readySchoolIds.has(displaySchool.id);
  const showInitialPlaceholder =
    latestSchoolsLoading || (latestSchools.length > 0 && !firstSchoolReady) || !displaySchool;
  const headlineSchoolName = displaySchool?.name ?? "A new school";
  const latestSchoolHomeHref = displaySchool?.slug
    ? `/schools/${displaySchool.slug}/home`
    : "/admin/schools";
  const countdownProgress = 1 - elapsedMs / SCHOOL_ROTATION_MS;
  const elapsedPercent = (1 - Math.max(0, Math.min(1, countdownProgress))) * 100;
  const panProgress = Math.max(0, Math.min(1, elapsedMs / SCHOOL_ROTATION_MS));
  const isPreparingTransition =
    latestSchools.length > 1 && elapsedMs >= SCHOOL_ROTATION_MS - 1000;
  const isPreparingBannerTransition =
    latestSchools.length > 1 && elapsedMs >= SCHOOL_ROTATION_MS - 500;

  return (
    <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div className="col-span-1 flex gap-4 h-full items-center">
        <div className="h-fit flex flex-col items-center justify-center w-full max-w-[30%]">
          <div className="flex-1 flex flex-col gap-2 w-full justify-center ">
            <QuickActionsCard
              title="Manage Schools"
              icon={<Users className="w-4 h-4" />}
              link="/admin/schools?modal=add-new-school"
            />
            <QuickActionsCard
              title="Manage Lessons"
              icon={<Book className="w-4 h-4" />}
              link="/admin/content/curriculum"
            />
            <QuickActionsCard
              title="Manage AP Cert"
              icon={<Shield className="w-4 h-4" />}
              link="/admin/content/certification"
            />
            <QuickActionsCard
              title="Manage Users"
              icon={<Users className="w-4 h-4" />}
              link="/admin/users"
            />
            <QuickActionsCard
              disabled
              title="Generate Reports"
              icon={<FileText className="w-4 h-4" />}
              link="/admin/generate-reports"
            />
          </div>
        </div>
        <div className="h-full flex items-center justify-center py-12">
          <Separator orientation="vertical" className="h-full w-fit mx-4" />
        </div>

        {/* News and Updates Card */}
        {showInitialPlaceholder ? (
          <div className="flex-1 w-full h-full block">
            <Card className="w-full h-full min-h-[300px] border-2 border-dashed border-muted-foreground/40 bg-transparent" />
          </div>
        ) : (
        <Link
          href={latestSchoolHomeHref}
          className="group flex-1 w-full h-full block"
          onMouseEnter={() => setIsCardHovered(true)}
          onMouseLeave={() => setIsCardHovered(false)}
        >
          <Card
            className={cn(
              "w-full h-full min-h-[300px] flex flex-col relative justify-end items-start overflow-hidden border-0 cursor-pointer transition-opacity duration-300",
              "bg-[var(--brand-bullyproof-primary)]",
              cardReady ? "opacity-0 animate-slide-down-fade-in" : ""
            )}
            style={
              cardReady
                ? {
                    animationDelay: JOIN_CARD_ANIMATION_DELAYS.card,
                    animationFillMode: "forwards",
                  }
                : undefined
            }
          >
          <CardHeader className="absolute top-3 left-3 z-20 p-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-[var(--brand-bullyproof-primary)] px-2.5 py-1">
              <Star className="h-3.5 w-3.5 text-white fill-white/20" />
              <span className="text-xs font-semibold text-white whitespace-nowrap">
                New School
              </span>
            </div>
          </CardHeader>
          <div className="absolute inset-0 overflow-hidden">
            {bannerUrl && (
              <div
                key={`banner-current-${displaySchool?.id ?? "none"}`}
                className={cn(
                  "absolute inset-0 transition-all duration-500 ease-out",
                  cardReady ? "opacity-0 [animation:var(--animate-banner-reveal)]" : ""
                )}
                style={{
                  ...(cardReady
                    ? {
                        animationDelay: JOIN_CARD_ANIMATION_DELAYS.banner,
                        animationFillMode: "forwards",
                      }
                    : {}),
                  ...(isPreparingBannerTransition
                    ? {
                        opacity: 0,
                        transform: "translateY(18px)",
                      }
                    : {}),
                }}
                aria-hidden
              >
                <div
                  className="absolute inset-0 will-change-transform"
                  style={{
                    backgroundImage: `url(${bannerUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: `${50 + panProgress * 6}% 50%`,
                    transform: `scale(${1 + panProgress * 0.015})`,
                  }}
                  aria-hidden
                />
              </div>
            )}
          </div>
          <div
            key={`gradient-${activeSchool?.id ?? "none"}`}
            className={cn(
              "absolute inset-0 transition-[inset,opacity] duration-500 ease-in-out group-hover:-inset-4",
              cardReady ? "opacity-0 [animation:var(--animate-slide-up-from-bottom)]" : "opacity-70"
            )}
            style={
              cardReady
                ? {
                    animationDelay: JOIN_CARD_ANIMATION_DELAYS.gradient,
                    animationFillMode: "forwards",
                  }
                : undefined
            }
            aria-hidden
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-primary)] via-[var(--brand-bullyproof-primary)]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bullyproof-secondary)] via-[var(--brand-bullyproof-secondary)]/55 to-transparent opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100" />
          </div>
          <CardFooter
            key={`footer-current-${displaySchool?.id ?? "none"}`}
            className="relative z-20 w-full flex items-end gap-3 transition-all duration-700 ease-out"
            style={
              isPreparingTransition
                ? { opacity: 0, transform: "translateY(14px)" }
                : undefined
            }
          >
            <div
              className={cn(
                "flex-shrink-0 transition-transform duration-300 ease-out group-hover:-translate-y-1",
                cardReady ? "opacity-0 animate-slide-up-fade-in" : "opacity-100"
              )}
              style={
                cardReady
                  ? {
                      animationDelay: JOIN_CARD_ANIMATION_DELAYS.avatar,
                      animationFillMode: "forwards",
                    }
                  : undefined
              }
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={headlineSchoolName}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-lg object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-white/20 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                  <Image
                    src="/images/bp-small-logo.svg"
                    alt=""
                    width={36}
                    height={36}
                    className="w-9 h-9 object-contain opacity-90"
                  />
                </div>
              )}
            </div>
            <CardTitle
              className={cn(
                "text-2xl font-normal text-white leading-tight transition-transform duration-300 ease-out group-hover:-translate-y-1 [text-shadow:0_2px_8px_rgba(0,0,0,0.45)]",
                cardReady ? "opacity-0 animate-slide-left-fade-in" : "opacity-100"
              )}
              style={
                cardReady
                  ? {
                      animationDelay: JOIN_CARD_ANIMATION_DELAYS.title,
                      animationFillMode: "forwards",
                    }
                  : undefined
              }
            >
              <span className="font-bold">{headlineSchoolName}</span>
            </CardTitle>
          </CardFooter>
          <div
            className="absolute bottom-0 left-0 right-0 z-20 h-1"
            style={{
              background: `linear-gradient(to right, transparent ${elapsedPercent}%, rgba(255,255,255,0.95) ${elapsedPercent}%)`,
            }}
          />
          </Card>
        </Link>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Total Schools Card */}
        <StaggeredAnimation index={0}>
          <SnapshotCardWithData
            link="/admin/schools"
            metricKey="schools"
            title="Total Schools"
            icon="School"
            subtitle="Schools actively using platform"
            scope="all"
          />
        </StaggeredAnimation>

        {/* Active Teachers Card */}
        <StaggeredAnimation index={1}>
          <SnapshotCardWithData
            metricKey="teachers"
            title="Active Teachers"
            icon="Users"
            subtitle="Teachers engaged this term"
            scope="all"
          />
        </StaggeredAnimation>
        {/* Engagement Rate Card */}
        <StaggeredAnimation index={2}>
          <SnapshotCardWithData
            metricKey="lessons/engagement-rate"
            title="Engagement Rate"
            icon="Activity"
            subtitle="Teachers active in last 30 days"
            scope="all"
          />
        </StaggeredAnimation>
        {/* Completed Lessons Card */}
        <StaggeredAnimation index={3}>
          <SnapshotCardWithData
            metricKey="lessons/completed"
            title="Completed Lessons"
            icon="BookOpen"
            subtitle="Lessons completed this term"
            scope="all"
          />
        </StaggeredAnimation>
      </div>
    </div>
  );
}
