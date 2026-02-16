"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";
import {
  CheckCircle2,
  Lock,
  PlayCircle,
  Download,
  Eye,
  FileQuestion,
  ChevronsRight,
  ChevronRight,
  TrendingUp,
  Award,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart, Label } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { compareSlidesByPosition } from "@/server/lib/fractional-position";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type {
  certificationCourses,
  courseTopics,
  courseTopicSlides,
} from "@/server/db/schema";
import { useMeStore } from "@/entities/me/model/store";
import { useMySchoolsQuery } from "@/entities/me/model/useMySchoolsQuery";
import { createSlug } from "@/utils/slug";
import { AnimatedThumbnail, type TopicSlide } from "@/components/organisms/animated-thumbnail";
import { useCertificationTopicsByCourseCode } from "@/entities/certification/model/topics-store";
import { useCertificationCourseByCode } from "@/entities/certification/model/store";
import Image from "next/image";
import { StarRating } from "@/components/atoms/star-rating";
import { TopicCertificate } from "@/components/molecules/topic-certificate";

type Course = typeof certificationCourses.$inferSelect & {
  topicCount?: number;
};

type Topic = typeof courseTopics.$inferSelect & {
  slides?: Array<typeof courseTopicSlides.$inferSelect>;
};

type TopicProgress = {
  id: string;
  topicId: string;
  status: string;
  scorePercentage: number | null;
  slideProgress: Record<string, any>;
  attemptNumber: number;
  completedAt?: string | null;
};

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseNameSlug = params?.course_name as string;
  usePageTitle(["courses", courseNameSlug]);

  const currentUser = useMeStore((s) => s.currentUser);
  const { data: schools = [] } = useMySchoolsQuery({ limit: 1 });

  // Fetch course by slug (still need API call for slug lookup, then use store)
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseNameSlug) return;

      try {
        setIsLoading(true);
        setError(null);

        const result = await certificationApi.courses.bySlug(courseNameSlug);
        if (!result.data) {
          setError(
            result.error?.message ?? "Failed to fetch certification course"
          );
          return;
        }

        setCourse(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [courseNameSlug]);

  // Use TQ hook to get topics (auto-fetches and caches)
  const { topics: topicsList, isLoading: isLoadingTopics } = useCertificationTopicsByCourseCode(
    course?.code || null,
    { includeSlides: true, includeUrls: true }
  );

  const [topicProgress, setTopicProgress] = useState<
    Map<string, TopicProgress>
  >(new Map());
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  
  // Track in-progress quiz attempts by topic ID
  const [inProgressQuizAttempts, setInProgressQuizAttempts] = useState<
    Map<string, any>
  >(new Map());
  
  // Animation state for progress bars
  const [animatedProgress, setAnimatedProgress] = useState<number[]>([]);
  const [certificationProgress, setCertificationProgress] = useState(0);
  
  // Animation state for radial chart
  const [animatedRadialChartData, setAnimatedRadialChartData] = useState<Array<{
    topic: string;
    topicName: string;
    completion: number;
    fill: string;
  }>>([]);

  // Calculate current topic and slide URL BEFORE early returns to ensure consistent hook ordering
  const currentTopic = useMemo(() => {
    return topicsList.find((topic) => {
      const progress = topicProgress.get(topic.id);
      return !progress || (progress.status !== "completed" && progress.status !== "passed");
    });
  }, [topicsList, topicProgress]);

  // Helper function to extract image slides from a topic
  const getImageSlidesForTopic = (topic: Topic): TopicSlide[] => {
    if (!topic.slides) return [];
    const slides = [...topic.slides].sort(compareSlidesByPosition);
    return slides
      .filter((s) => s.kind === "image")
      .sort(compareSlidesByPosition)
      .map((s) => ({
        id: s.id,
        position: s.position,
        kind: s.kind,
        imageUrl: s.imageUrl,
        signedUrl: (s as any).signedUrl || null,
      }));
  };

  const currentTopicImageSlides = currentTopic ? getImageSlidesForTopic(currentTopic) : [];
  const currentTopicFirstSlide = currentTopicImageSlides[0];
  const currentTopicSlideUrl = currentTopicFirstSlide?.signedUrl || null;

  useEffect(() => {
    const fetchProgress = async () => {
      if (!course) return;

      try {
        setIsLoadingProgress(true);
        const result = await certificationApi.courses.progress.byCode(course.code);
        if (result.data?.progress) {
          // Create a map of topicId -> progress for easy lookup
          const progressMap = new Map<string, TopicProgress>();
          result.data.progress.forEach((progress: TopicProgress) => {
            progressMap.set(progress.topicId, progress);
          });
          setTopicProgress(progressMap);
        }
      } catch (err) {
        console.error("Failed to fetch progress:", err);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    fetchProgress();
  }, [course]);

  // Fetch in-progress quiz attempts for topics with quizzes
  const currentTopicId = currentTopic?.id;
  const currentTopicHasQuiz = currentTopic?.hasQuiz;
  useEffect(() => {
    const fetchInProgressAttempts = async () => {
      if (!currentTopicId || !currentTopicHasQuiz) return;

      try {
        const result = await certificationApi.topics.progress.getQuizInProgress(
          currentTopicId
        );
        if (result.data) {
          setInProgressQuizAttempts((prev) => {
            const newMap = new Map(prev);
            if (result.data) {
              newMap.set(currentTopicId, result.data);
            } else {
              newMap.delete(currentTopicId);
            }
            return newMap;
          });
        }
      } catch (err) {
        console.error("Failed to fetch in-progress quiz attempt:", err);
      }
    };

    fetchInProgressAttempts();
  }, [currentTopicId, currentTopicHasQuiz]);

  // Helper function to animate a value
  const animateValue = useCallback((
    target: number,
    setValue: (value: number) => void,
    duration: number,
    onComplete?: () => void
  ) => {
    const startValue = 0;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (target - startValue) * eased;
      
      setValue(Math.round(currentValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setValue(target);
        onComplete?.();
      }
    };
    
    requestAnimationFrame(animate);
  }, []);

  // Calculate topic statuses (needed for animation) - memoized to prevent infinite loops
  const topicStatuses: Array<"completed" | "current" | "locked" | "retry_available"> = useMemo(() => {
    return topicsList.map((topic, index) => {
      const progress = topicProgress.get(topic.id);
      
      // Check if it's the current topic FIRST (so BP man always shows on current topic)
      if (topic === currentTopic) {
        return "current";
      }
      
      if (progress && (progress.status === "completed" || progress.status === "passed")) {
        return "completed";
      }
      
      // Check if topic needs retry (has quiz, attempted but not passed)
      if (progress && progress.scorePercentage !== null && progress.scorePercentage !== undefined) {
        const isPassed = progress.status === "passed" || progress.scorePercentage >= 60;
        if (!isPassed && topic.hasQuiz) {
          return "retry_available";
        }
      }
      
      return "locked";
    });
  }, [topicsList, topicProgress, currentTopic]);

  // Calculate completion percentage for each topic
  const calculateTopicCompletion = useCallback((topic: Topic, progress: TopicProgress | undefined): number => {
    if (!progress) return 0;

    const totalSlides = (topic as any).slideCount ?? topic.slides?.length ?? 0;
    if (totalSlides === 0) return 0;

    // Count viewed slides
    let slidesViewed = 0;
    if (progress.slideProgress) {
      const slideProgressData = progress.slideProgress as Record<string, any>;
      slidesViewed = Object.keys(slideProgressData).filter(
        (slideId) => slideProgressData[slideId]?.viewed || slideProgressData[slideId]?.answered
      ).length;
    }

    const hasQuiz = (topic as any).hasQuiz ?? false;
    
    if (hasQuiz) {
      // Topics with quiz: slides = 50%, quiz = 50%
      const slidesPercentage = (slidesViewed / totalSlides) * 50;
      const quizScore = progress.scorePercentage ?? 0;
      const quizPercentage = (quizScore / 100) * 50;
      return Math.round(slidesPercentage + quizPercentage);
    } else {
      // Topics without quiz: slides = 100%
      return Math.round((slidesViewed / totalSlides) * 100);
    }
  }, []);

  // Sequential animation for progress bars and radial chart
  useEffect(() => {
    if (isLoadingTopics || isLoadingProgress || topicsList.length === 0) {
      // Use functional updates to avoid creating new array references when already empty
      setAnimatedProgress(prev => prev.length === 0 ? prev : []);
      setCertificationProgress(0);
      setAnimatedRadialChartData(prev => prev.length === 0 ? prev : []);
      return;
    }

    // Calculate completed topics count
    const completedTopicsCount = Array.from(topicProgress.values()).filter(
      (p) => p.status === "completed" || p.status === "passed"
    ).length;
    const totalTopicsCount = topicsList.length;

    // Calculate target completion percentages for radial chart (actual completion based on slides + quiz)
    const targetCompletions = topicsList.map((topic, index) => {
      const progress = topicProgress.get(topic.id);
      return calculateTopicCompletion(topic, progress);
    });

    // Calculate target values for progress bars (binary: 0 or 100)
    const targetValues = topicsList.map((topic, index) => {
      const progress = topicProgress.get(topic.id);
      const isCompleted = progress && (progress.status === "completed" || progress.status === "passed");
      
      if (isCompleted) return 100;
      return 0; // Current and locked topics stay at 0 for progress bars
    });

    // Initialize radial chart data with colors
    const initialRadialData = topicsList.map((topic, index) => {
      const status = topicStatuses[index];
      const topicNum = topic.courseOrder ?? index + 1;
      
      let fillColor = "hsl(var(--muted))"; // locked
      if (status === "completed") {
        fillColor = "rgb(59 130 246)"; // blue-500
      } else if (status === "current") {
        fillColor = "rgb(34 197 94)"; // green-500
      } else if (status === "retry_available") {
        fillColor = "var(--brand-bullyproof-secondary)"; // Bullyproof secondary
      }
      
      return {
        topic: `T${topicNum}`,
        topicName: topic.title,
        completion: 0, // Start at 0 for animation
        fill: fillColor,
      };
    });

    // Reset animation state
    setAnimatedProgress(new Array(topicsList.length).fill(0));
    setCertificationProgress(0);
    setAnimatedRadialChartData(initialRadialData);

    // Cancellation flag for cleanup
    let cancelled = false;

    // Animate each bar sequentially
    const animationDuration = 800; // ms per bar
    const delayBetweenBars = 250; // ms delay between bars
    
    let currentIndex = 0;
    
    const animateBar = (index: number) => {
      if (cancelled) return;
      if (index >= topicsList.length) {
        // All topic bars done, animate certification
        const certTarget = completedTopicsCount === totalTopicsCount && totalTopicsCount > 0 ? 100 : 0;
        animateValue(
          certTarget,
          (value) => { if (!cancelled) setCertificationProgress(value); },
          animationDuration
        );
        return;
      }

      const target = targetValues[index];
      const targetCompletion = targetCompletions[index];
      
      // Animate progress bar (binary: 0 or 100)
      animateValue(
        target,
        (value) => {
          if (cancelled) return;
          setAnimatedProgress((prev) => {
            const newProgress = [...prev];
            newProgress[index] = value;
            return newProgress;
          });
        },
        animationDuration
      );
      
      // Simultaneously animate radial chart completion (actual percentage)
      animateValue(
        targetCompletion,
        (value) => {
          if (cancelled) return;
          setAnimatedRadialChartData((prev) => {
            const newData = [...prev];
            if (newData[index]) {
              newData[index] = {
                ...newData[index],
                completion: value,
              };
            }
            return newData;
          });
        },
        animationDuration,
        () => {
          if (cancelled) return;
          // On complete, start next bar after delay
          setTimeout(() => {
            currentIndex++;
            animateBar(currentIndex);
          }, delayBetweenBars);
        }
      );
    };

    // Start animation after a short delay
    const startTimeout = setTimeout(() => {
      animateBar(0);
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(startTimeout);
    };
  }, [topicsList, topicProgress, isLoadingTopics, isLoadingProgress, animateValue, topicStatuses, calculateTopicCompletion]);

  // Calculate progress data from topics and progress (must be before early returns for hook order)
  const completedTopics = Array.from(topicProgress.values()).filter(
    (p) => p.status === "completed" || p.status === "passed"
  ).length;
  const totalTopics = topicsList.length;
  const isCertificationComplete = completedTopics === totalTopics && totalTopics > 0;

  // Get the last completed topic's completion date for the certificate (must be before early returns)
  const lastCompletedTopicDate = useMemo(() => {
    if (!isCertificationComplete) return null;
    const completedProgresses = Array.from(topicProgress.values()).filter(
      (p) => (p.status === "completed" || p.status === "passed") && p.completedAt
    );
    if (completedProgresses.length === 0) return null;
    // Sort by completedAt descending and get the most recent
    const sorted = completedProgresses.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });
    return sorted[0]?.completedAt || null;
  }, [completedTopics, totalTopics, topicProgress, isCertificationComplete]);

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

  if (!course) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Course not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get user name
  const firstName = currentUser?.firstName || "";
  const lastName = currentUser?.lastName || "";
  const userName =
    currentUser?.fullName ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "User";

  // Get user role
  const userRole =
    currentUser?.schoolRoles?.[0]?.roleName ||
    currentUser?.platformRoles?.[0] ||
    "User";

  // Get school name
  const schoolName = schools[0]?.name || "No school assigned";

  // Get start date (using welcome tutorial completion timestamp)
  const welcomeTutorialCompletedAt =
    (currentUser?.metadata as any)?.tutorials?.welcome?.completedAt;

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const startDate = welcomeTutorialCompletedAt
    ? formatFullDate(welcomeTutorialCompletedAt)
    : currentUser?.createdAt
      ? formatFullDate(currentUser.createdAt)
      : "N/A";

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const currentTopicNumber = currentTopic
    ? (currentTopic.courseOrder ?? topicsList.indexOf(currentTopic) + 1)
    : totalTopics + 1;

  // Calculate current topic progress
  const currentTopicProgress = currentTopic
    ? topicProgress.get(currentTopic.id)
    : null;

  let slidesViewed = 0;
  let totalSlides = 0;
  let quizStatus: "not_attempted" | "passed" | "retry_available" =
    "not_attempted";

  // Get total slides from topic's slides array
  if (currentTopic?.slides) {
    totalSlides = currentTopic.slides.length;
  }

  // Count viewed slides from progress
  if (currentTopicProgress?.slideProgress) {
    const slideProgressData = currentTopicProgress.slideProgress as Record<
      string,
      any
    >;
    slidesViewed = Object.keys(slideProgressData).filter(
      (slideId) =>
        slideProgressData[slideId]?.viewed ||
        slideProgressData[slideId]?.answered
    ).length;
  }

  // Determine quiz status using the same logic as topic timeline
  // Check if quiz has been attempted (scorePercentage is not null)
  if (currentTopicProgress?.scorePercentage !== null && currentTopicProgress?.scorePercentage !== undefined) {
    // Quiz has been attempted - check if passed
    quizStatus =
      currentTopicProgress.status === "passed" ||
      (currentTopicProgress.scorePercentage >= 60)
        ? "passed"
        : "retry_available";
  } else {
    // No quiz attempt yet
    quizStatus = "not_attempted";
  }

  // Use animated radial chart data if available, otherwise calculate static values
  const radialChartData = animatedRadialChartData.length > 0 
    ? animatedRadialChartData
    : topicsList.map((topic, index) => {
        const progress = topicProgress.get(topic.id);
        const status = topicStatuses[index];
        const completion = calculateTopicCompletion(topic, progress);
        const topicNum = topic.courseOrder ?? index + 1;
        
        // Determine color based on status
        let fillColor = "hsl(var(--muted))"; // locked
        if (status === "completed") {
          fillColor = "rgb(59 130 246)"; // blue-500
        } else if (status === "current") {
          fillColor = "var(--brand-bullyproof-primary)"; // Bullyproof primary
        } else if (status === "retry_available") {
          fillColor = "var(--brand-bullyproof-secondary)"; // Bullyproof secondary
        }
        
        return {
          topic: `T${topicNum}`,
          topicName: topic.title,
          completion,
          fill: fillColor,
        };
      });

  // Radial chart config - create a config entry for each topic
  const radialChartConfig = {
    completion: {
      label: "Completion",
    },
    ...topicsList.reduce((config, topic, index) => {
      const topicNum = topic.courseOrder ?? index + 1;
      const key = `topic${topicNum}`;
      const status = topicStatuses[index];
      let fillColor = "hsl(var(--muted))"; // locked
      if (status === "completed") {
        fillColor = "rgb(59 130 246)"; // blue-500
      } else if (status === "current") {
        fillColor = "var(--brand-bullyproof-primary)"; // Bullyproof primary
      } else if (status === "retry_available") {
        fillColor = "var(--brand-bullyproof-secondary)"; // Bullyproof secondary
      }
      config[key] = {
        label: `T${topicNum}`,
        color: fillColor,
      };
      return config;
    }, {} as Record<string, { label: string; color: string }>),
  } satisfies ChartConfig;

  const courseSlug = course ? createSlug(course.name) : "";

  const currentTopicImageUrl = currentTopicFirstSlide?.signedUrl || currentTopicSlideUrl;

  // Helper function to check if topic has been started
  const isTopicStarted = (progress: TopicProgress | undefined): boolean => {
    if (!progress?.slideProgress) return false;
    const slideProgressData = progress.slideProgress as Record<string, any>;
    return Object.keys(slideProgressData).some(
      (slideId) => slideProgressData[slideId]?.viewed
    );
  };

  // Check if user is admin
  const isAdmin = userRole === "admin" || currentUser?.platformRoles?.includes("admin");

  return (
    <>
      <FeatureGuard feature="/ap-certification" />
      <div className="h-full w-full flex flex-col gap-6 p-6">
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Amayda Program Card - 1/3 width */}
        <Card 
          className="lg:w-1/3 group rotating-gradient-bg h-full flex flex-col items-center justify-center gap-3 p-6"
          style={{
            boxShadow: '0 0 30px rgba(3, 132, 147, 0.4)',
          }}
        >
          <Image
            src="/images/ap-teacher-icon.svg"
            alt="Amayda Program Logo"
            width={48}
            height={48}
            className="shrink-0"
          />
          <div className="flex flex-col gap-1">
            <p className="text-lg font-normal text-white text-center">Welcome to the</p>  
            <p className="text-3xl font-black text-white text-center"><span className="font-black">AMAYDA Program</span></p>
          </div>
        </Card>

        {/* Chevron separator */}
        <div className="hidden lg:flex items-center justify-center flex-shrink-0">
          <ChevronsRight className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Current Topic Card or Certificate - 2/3 width */}
        {isLoadingTopics ? (
          <Card className="lg:w-2/3 flex flex-row overflow-hidden p-0">
            <div className="flex-shrink-0 h-full aspect-video bg-muted/30 border-r">
              <Skeleton className="h-full w-full" />
            </div>
            <div className="flex-1 flex flex-col">
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-6 flex-1">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-24 h-16 rounded-md" />
                  <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </div>
          </Card>
        ) : isCertificationComplete ? (
          /* Certificate - shown when all topics are completed, rendered without Card wrapper */
          <TopicCertificate
            user={currentUser}
            completedAt={lastCompletedTopicDate}
            className="lg:w-2/3"
          />
        ) : currentTopic ? (
          <Card className="lg:w-2/3 flex flex-row overflow-hidden h-full gap-0 py-0">
            {/* Thumbnail - Left side */}
            {currentTopicImageUrl ? (
              <div className="flex-shrink-0 h-full aspect-video relative bg-muted/30 border-r overflow-hidden">
                <Image
                  src={currentTopicImageUrl}
                  alt={currentTopic.title}
                  fill
                  className="object-contain"
                  // sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 h-full aspect-video bg-muted/30 border-r flex items-center justify-center">
                <FileQuestion className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Content - Right side */}
            <div className="flex-1 flex flex-col min-w-0 h-full justify-between py-4">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex flex-col items-start gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="text-xs font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
                  >
                    Topic {currentTopicNumber}
                  </Badge>
                  <CardTitle className="text-xl line-clamp-2 flex-1 min-w-0">{currentTopic.title}</CardTitle>
                </div>
              </CardHeader>
              
              <CardFooter className="pt-0 flex-shrink-0 flex justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{totalSlides} {totalSlides === 1 ? 'slide' : 'slides'}</span>
                  {currentTopic.hasQuiz && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <Badge
                        variant="outline"
                        className="text-xs border-purple-700 bg-purple-500/5 text-purple-700 dark:text-purple-400 flex items-center gap-0.5 px-1.5 py-0 h-5"
                      >
                        <FileQuestion className="h-3 w-3" />
                        Quiz
                      </Badge>
                    </>
                  )}
                </div>
                {currentTopicProgress?.status === "quiz_unlocked"
                  ? (() => {
                      // Check if there's an in-progress quiz attempt
                      const hasInProgressAttempt = inProgressQuizAttempts.has(currentTopic.id) && 
                        inProgressQuizAttempts.get(currentTopic.id) !== null;
                      
                      return (
                        <Button
                          className="w-1/2 bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 hover:text-white"
                          size="default"
                          onClick={async () => {
                            const topicSlug = createSlug(currentTopic.title);
                            // If there's an in-progress attempt, navigate to the quiz page which will resume it
                            // Otherwise, navigate to quiz overview page
                            if (hasInProgressAttempt) {
                              const inProgressAttempt = inProgressQuizAttempts.get(currentTopic.id);
                              if (inProgressAttempt?.quizId) {
                                // Fetch quiz to get title for slug
                                try {
                                  const quizResult = await certificationApi.quizzes.byId(inProgressAttempt.quizId);
                                  if (quizResult.data) {
                                    const quizSlug = createSlug(quizResult.data.title);
                                    router.push(`/courses/${courseSlug}/${topicSlug}/quiz/${quizSlug}`);
                                  } else {
                                    router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                  }
                                } catch (err) {
                                  console.error("Failed to fetch quiz:", err);
                                  router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                }
                              } else {
                                router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                              }
                            } else {
                              router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                            }
                          }}
                        >
                          <span className="flex items-center gap-2">
                            {hasInProgressAttempt ? "Continue Quiz" : "Start Quiz"}
                            <ChevronsRight className="h-4 w-4" style={{ animation: "bounce-right-subtle 1s ease-in-out infinite" }} />
                          </span>
                        </Button>
                      );
                    })()
                  : quizStatus === "not_attempted"
                    ? slidesViewed === totalSlides
                      ? (() => {
                          // Check if there's an in-progress quiz attempt
                          const hasInProgressAttempt = inProgressQuizAttempts.has(currentTopic.id) && 
                            inProgressQuizAttempts.get(currentTopic.id) !== null;
                          
                          return (
                            <Button
                              className="w-full bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 hover:text-white"
                              size="default"
                              onClick={async () => {
                                const topicSlug = createSlug(currentTopic.title);
                                // If there's an in-progress attempt, navigate to the quiz page which will resume it
                                // Otherwise, navigate to quiz overview page
                                if (hasInProgressAttempt) {
                                  const inProgressAttempt = inProgressQuizAttempts.get(currentTopic.id);
                                  if (inProgressAttempt?.quizId) {
                                    // Fetch quiz to get title for slug
                                    try {
                                      const quizResult = await certificationApi.quizzes.byId(inProgressAttempt.quizId);
                                      if (quizResult.data) {
                                        const quizSlug = createSlug(quizResult.data.title);
                                        router.push(`/courses/${courseSlug}/${topicSlug}/quiz/${quizSlug}`);
                                      } else {
                                        router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                      }
                                    } catch (err) {
                                      console.error("Failed to fetch quiz:", err);
                                      router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                    }
                                  } else {
                                    router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                  }
                                } else {
                                  router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                }
                              }}
                            >
                              {hasInProgressAttempt ? "Continue Quiz" : "Take Quiz"}
                            </Button>
                          );
                        })()
                      : (
                          <Button
                            className="max-w-1/2 w-full bg-[var(--brand-bullyproof-primary)] text-white gap-1 hover:bg-[var(--brand-bullyproof-primary)]/90 hover:text-white"
                            size="default"
                            onClick={() => {
                              const topicSlug = createSlug(currentTopic.title);
                              router.push(`/courses/${courseSlug}/${topicSlug}/slides`);
                            }}
                          >
                            {isTopicStarted(currentTopicProgress) ? "Continue Topic" : "Begin"}
                            <ChevronsRight className="h-4 w-4" style={{ animation: "bounce-right-subtle 1s ease-in-out infinite" }} />
                          </Button>
                        )
                    : quizStatus === "passed"
                      ? (
                          <Button
                            className="w-fit bg-[var(--brand-bullyproof-primary)] text-white gap-1 hover:bg-[var(--brand-bullyproof-primary)]/90 hover:text-white"
                            size="default"
                            onClick={() => {
                              const topicSlug = createSlug(currentTopic.title);
                              router.push(`/courses/${courseSlug}/${topicSlug}/slides`);
                            }}
                          >
                            Review slides
                            <ChevronsRight className="h-4 w-4" style={{ animation: "bounce-right-subtle 1s ease-in-out infinite" }} />
                          </Button>
                        )
                      : (
                          <Button
                            className="w-fit bg-[var(--brand-bullyproof-secondary)] text-white gap-1 hover:bg-[var(--brand-bullyproof-secondary)]/90 hover:text-white"
                            size="default"
                            onClick={async () => {
                              const topicSlug = createSlug(currentTopic.title);
                              // Fetch first quiz ID for this topic
                              try {
                                const quizzesResult = await certificationApi.quizzes.list(currentTopic.id);
                                if (quizzesResult.data && quizzesResult.data.length > 0) {
                                  const firstQuiz = quizzesResult.data[0];
                                  router.push(`/courses/${courseSlug}/${topicSlug}/quiz/${firstQuiz.id}`);
                              } else {
                                // No quiz found, navigate to slides instead
                                router.push(`/courses/${courseSlug}/${topicSlug}/slides`);
                              }
                              } catch (err) {
                                console.error("Failed to fetch quizzes:", err);
                              }
                            }}
                          >
                            Retake Quiz
                          </Button>
                        )}
              </CardFooter>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Separator between top section and progress section */}
      <Separator  className="my-4"/>

      {/* Topic Timeline - Full Width */}
      {isLoadingTopics ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-40" />
          </CardHeader>
          <CardContent>
            {/* Progress Bar Skeleton */}
            <div className="mb-6">
              <div className="flex gap-2 items-end">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="flex-1 h-[10px] rounded-md" />
                ))}
              </div>
            </div>
            <Separator className="mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="w-24 h-16 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-8" />
                      <Skeleton className="h-6 w-48" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : topicsList.length > 0 ? (
        <div className="">
          {/* My Progress Badge/Heading - Above Card */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-1.5 text-base font-semibold">
              <TrendingUp className="size-5" />
              My Progress
            </div>
          </div>
          
          <Card className="relative overflow-visible mt-4">
            {/* Gradient overlay on card - Hidden when certification is complete */}
            {!isCertificationComplete && (
              <div 
                className="absolute top-0 left-0 right-0 h-48 pointer-events-none z-0 rounded-t-lg"
                style={{
                  background: "linear-gradient(to bottom, var(--brand-bullyproof-primary), transparent)",
                }}
              />
            )}
          <CardContent className="overflow-visible pt-4">
            {/* Progress Bar Section - At Top - Hidden when certification is complete */}
            {!isCertificationComplete && (
              <>
                {isLoadingTopics || isLoadingProgress ? (
                  <div className="mb-6">
                    <div className="flex gap-2 items-end">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="flex-1 h-[10px] rounded-md" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 overflow-visible">
                    {/* Topic Progress Bars */}
                    <div className="flex gap-2 items-end overflow-visible">
                      {topicsList.map((topic, index) => {
                        const topicNum = topic.courseOrder ?? index + 1;
                        const progress = topicProgress.get(topic.id);
                        const status = topicStatuses[index];
                        const isCompleted = status === "completed";
                        const isCurrent = status === "current";
                        const isRetryAvailable = status === "retry_available";
                        const isLocked = status === "locked";
                        const currentIndex = topicsList.findIndex((t, i) => topicStatuses[i] === "current");
                        const isNextAfterCurrent = index === currentIndex + 1 && currentIndex !== -1;
                        
                        const animatedValue = animatedProgress[index] ?? 0;
                        const progressValue = isCompleted ? animatedValue : isCurrent ? 0 : 0;

                        return (
                          <div
                            key={topic.id}
                            className={cn(
                              "flex-1 flex flex-col gap-1 group relative transition-all duration-300",
                              isCurrent && "translate-y-[-10px]",
                              "hover:translate-y-[-15px]"
                            )}
                            style={{
                              animation: isCurrent ? "float-gentle 3s ease-in-out infinite" : undefined,
                            }}
                            onMouseEnter={(e) => {
                              if (!isCurrent) {
                                e.currentTarget.style.animation = "float-gentle 3s ease-in-out infinite";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isCurrent) {
                                e.currentTarget.style.animation = "";
                              }
                            }}
                          >
                            {/* Topic Badge - Above for non-active, below for active */}
                            {!isCurrent && !isNextAfterCurrent && (
                              <div className="flex justify-center">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs font-bold border-0 py-0 px-1.5 h-5 rounded-sm transition-all duration-200",
                                    "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                                  )}
                                >
                                  Topic {topicNum}
                                </Badge>
                              </div>
                            )}
                            
                            {/* BP Man Image - Only on active progress bar */}
                            {isCurrent && (
                              <div className="relative w-full mb-1 overflow-visible" style={{ height: 'auto' }}>
                                {/* BP Man - Fixed position, bleeding over top */}
                                <div className="inline-block -mt-8">
                                  <Image
                                    src="/images/bp-man/bp-man-cape.svg"
                                    alt="BP Man"
                                    width={100}
                                    height={100}
                                    className="w-full h-auto"
                                    style={{
                                      animation: "float-gentle 3s ease-in-out infinite",
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Progress Bar */}
                            <div className="relative">
                              <Progress
                                value={progressValue}
                                className={cn(
                                  "h-[10px] w-full",
                                  isCurrent && "ring-2 ring-[var(--brand-bullyproof-primary)] ring-offset-1 rounded-md",
                                  isRetryAvailable && "ring-2 ring-[var(--brand-bullyproof-secondary)] ring-offset-1 rounded-md"
                                )}
                                indicatorStyle={{
                                  backgroundColor: isCompleted 
                                    ? "rgb(59 130 246)" // blue-500
                                    : isCurrent 
                                    ? "var(--brand-bullyproof-primary)" // Bullyproof primary
                                    : isRetryAvailable
                                    ? "var(--brand-bullyproof-secondary)" // Bullyproof secondary
                                    : "hsl(var(--muted))",
                                }}
                              />
                            </div>
                            
                            {/* Topic Badge - Below for active */}
                            {isCurrent && (
                              <div className="flex justify-center mt-1">
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-bold border-0 py-0 px-1.5 h-5 rounded-sm opacity-100 animate-pulse"
                                >
                                  Topic {topicNum}
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Certificate Progress Bar - Last */}
                      <div className="flex-1 flex flex-col gap-1 group relative transition-all duration-300 hover:translate-y-[-15px]">
                        {/* Certificate Icon */}
                        <div className="flex justify-center mb-2">
                          <Image 
                            src="/images/ap-badge.svg"
                            alt="AP Logo"
                            width={82}
                            height={82}
                            className="animate-bounce-slow"
                           
                          />
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="relative">
                          <Progress
                            value={isCertificationComplete ? certificationProgress : 0}
                            className="h-[10px] w-full"
                            indicatorStyle={{
                              backgroundColor: isCertificationComplete 
                                ? "rgb(59 130 246)" // blue-500
                                : "hsl(var(--muted))",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Separator between progress bar and timeline */}
                <Separator className="mb-6" />
              </>
            )}

            <div className="space-y-3">
              {topicsList.map((topic, index) => {
                const status = topicStatuses[index];
                const progress = topicProgress.get(topic.id);
                const imageSlidesList = getImageSlidesForTopic(topic);

                const topicNumber = topic.courseOrder ?? index + 1;
                // Use enriched data if available
                // Note: hasQuiz will be undefined until enriched data loads, so we default to false
                // The enriched data should load automatically via the store's getEnrichedTopics
                const hasQuiz = topic.hasQuiz ?? false;
                const slideCount = topic.slideCount ?? (topic.slides?.length ?? 0);
                const topicStarted = isTopicStarted(progress);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";

                // Calculate slides viewed for this topic
                let slidesViewed = 0;
                if (progress?.slideProgress) {
                  const slideProgressData = progress.slideProgress as Record<string, any>;
                  slidesViewed = Object.keys(slideProgressData).filter(
                    (slideId) => slideProgressData[slideId]?.viewed || slideProgressData[slideId]?.answered
                  ).length;
                }

                // Determine quiz status using the same logic as top section
                let quizStatus: "not_attempted" | "passed" | "retry_available" = "not_attempted";
                if (progress && progress.scorePercentage !== null && progress.scorePercentage !== undefined) {
                  quizStatus =
                    progress.status === "passed" || progress.scorePercentage >= 60
                      ? "passed"
                      : "retry_available";
                } else {
                  quizStatus = "not_attempted";
                }

                const handleCardClick = () => {
                  // Don't allow clicking on locked topics
                  if (status === "locked") return;
                  
                  const topicSlug = createSlug(topic.title);
                  router.push(`/courses/${courseSlug}/${topicSlug}/slides`);
                };

                const handleReviewClick = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const topicSlug = createSlug(topic.title);
                  router.push(`/courses/${courseSlug}/${topicSlug}/slides`);
                };

                const handleQuizClick = async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const topicSlug = createSlug(topic.title);
                  try {
                    const quizzesResult = await certificationApi.quizzes.list(topic.id);
                    if (quizzesResult.data && quizzesResult.data.length > 0) {
                      const firstQuiz = quizzesResult.data[0];
                      const quizSlug = createSlug(firstQuiz.title);
                      router.push(`/courses/${courseSlug}/${topicSlug}/quiz/${quizSlug}`);
                    } else {
                      // No quiz found, navigate to quiz overview page
                      router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                    }
                  } catch (err) {
                    console.error("Failed to fetch quizzes:", err);
                    // Fallback to quiz overview page
                    router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                  }
                };

                const handleContinueClick = async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const topicSlug = createSlug(topic.title);
                  
                  // If status is quiz_unlocked, navigate to quiz instead of slides
                  if (progress?.status === "quiz_unlocked") {
                    // Check if there's an in-progress quiz attempt
                    try {
                      const result = await certificationApi.topics.progress.getQuizInProgress(topic.id);
                      if (result.data?.quizId) {
                        // Fetch quiz to get title for slug
                        try {
                          const quizResult = await certificationApi.quizzes.byId(result.data.quizId);
                          if (quizResult.data) {
                            const quizSlug = createSlug(quizResult.data.title);
                            router.push(`/courses/${courseSlug}/${topicSlug}/quiz/${quizSlug}`);
                          } else {
                            router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                          }
                        } catch (err) {
                          console.error("Failed to fetch quiz:", err);
                          router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                        }
                      } else {
                        router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                      }
                    } catch (err) {
                      console.error("Failed to fetch in-progress quiz attempt:", err);
                      router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                    }
                  } else {
                    router.push(`/courses/${courseSlug}/${topicSlug}/slides`);
                  }
                };

                const isLocked = status === "locked";
                const isRetryAvailable = status === "retry_available";

                // Calculate previous topic number for locked topics
                const previousTopicNumber = topicNumber > 1 ? topicNumber - 1 : 1;

                return (
                  <div
                    key={topic.id}
                    onClick={isCompleted ? undefined : handleCardClick}
                    className={cn(
                      "flex items-center gap-4 px-5 py-0 rounded-lg border transition-all duration-300",
                      isCompleted && "border-muted",
                      isCurrent && "border-[var(--brand-bullyproof-primary)] border-2 bg-[var(--brand-bullyproof-primary)]/5 hover:bg-[var(--brand-bullyproof-primary)]/10 cursor-pointer",
                      isRetryAvailable && "border-[var(--brand-bullyproof-secondary)] border-2 bg-[var(--brand-bullyproof-secondary)]/5 hover:bg-[var(--brand-bullyproof-secondary)]/10 cursor-pointer",
                      isLocked && "group cursor-not-allowed opacity-60"
                    )}
                  >
                    <div className="flex-shrink-0 py-3">
                      {isCompleted && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 transition-colors" />
                      )}
                      {isCurrent && (
                        <PlayCircle className="h-5 w-5 text-[var(--brand-bullyproof-primary)]" />
                      )}
                      {isRetryAvailable && (
                        <PlayCircle className="h-5 w-5 text-[var(--brand-bullyproof-secondary)]" />
                      )}
                      {status === "locked" && (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    {/* Thumbnail */}
                    {imageSlidesList.length > 0 && (
                      <div className="relative w-40 aspect-video flex-shrink-0 overflow-hidden rounded-md bg-muted h-full">
                        <AnimatedThumbnail
                          imageSlidesList={imageSlidesList}
                          topicTitle={topic.title}
                          cardIndex={index}
                          isPaused={false}
                          isCertification={true}
                        />
                      </div>
                    )}
                    <div className="flex-1 flex items-center justify-between gap-4 py-3">
                      {/* Left side - Topic info */}
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        {/* Topic Number Badge - Top */}
                        <Badge
                          variant="secondary"
                          className="text-xs font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0 w-fit"
                        >
                          Topic {topicNumber}
                        </Badge>
                        
                        {/* Title */}
                        <p className={cn(
                          "text-lg font-semibold transition-colors max-w-3/4",
                          isLocked && "text-muted-foreground"
                        )}>
                          {isLocked && topicNumber > 1 ? (
                            <>
                              <span className="group-hover:hidden">
                                {topic.title}
                              </span>
                              <span className="hidden group-hover:inline">
                                Complete Topic {previousTopicNumber}
                              </span>
                            </>
                          ) : (
                            topic.title
                          )}
                        </p>
                        
                        {/* Slides and Quiz Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {slideCount > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs border py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
                            >
                              {slideCount} {slideCount === 1 ? "slide" : "slides"}
                            </Badge>
                          )}
                          {hasQuiz && (
                            <Badge
                              variant="outline"
                              className="text-xs border-purple-700 bg-purple-500/5 text-purple-700 dark:text-purple-400 flex items-center rounded-sm gap-0.5 px-1.5 py-0 h-5"
                            >
                              <FileQuestion className="h-3 w-3" />
                              Quiz
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Middle - Star Rating */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasQuiz && (
                          <>
                            {isAdmin && progress && progress.scorePercentage !== null && (
                              <span className="text-sm text-muted-foreground">
                                Attempt {progress.attemptNumber} •
                              </span>
                            )}
                            <StarRating
                              correctAnswers={
                                isLocked 
                                  ? 0 
                                  : progress && progress.scorePercentage !== null
                                    ? Math.round((progress.scorePercentage / 100) * 5)
                                    : 0
                              }
                              totalQuestions={5}
                              passingThreshold={60}
                            />
                          </>
                        )}
                      </div>
                      
                      {/* Right side - Action buttons */}
                      {(isCompleted || isLocked) && (() => {
                        // Determine if slides should be "Review" (after quiz unlocked/passed) or "View" (before)
                        const isQuizUnlockedOrPassed = progress?.status === "quiz_unlocked" || 
                                                       quizStatus === "passed" || 
                                                       (hasQuiz && slidesViewed === slideCount);
                        const slidesButtonText = isQuizUnlockedOrPassed ? "Review Slides" : "View Slides";
                        
                        return (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {hasQuiz && (
                              <Button
                                variant="ghost"
                                size="lg"
                                onClick={isLocked ? undefined : handleQuizClick}
                                disabled={isLocked}
                                className="flex items-center gap-2"
                              >
                                <ClipboardList className="h-4 w-4" />
                                {isLocked || !progress || progress.scorePercentage === null ? "Take Quiz" : "Retake Quiz"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="lg"
                              onClick={isLocked ? undefined : handleReviewClick}
                              disabled={isLocked}
                              className="flex items-center gap-2"
                            >
                              <BookOpen className="h-4 w-4" />
                              {slidesButtonText}
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                    {isCurrent && (() => {
                      // Determine which button should be active
                      const isQuizActive = progress?.status === "quiz_unlocked" || 
                                          (quizStatus === "not_attempted" && slidesViewed === slideCount && hasQuiz) ||
                                          quizStatus === "retry_available";
                      const isSlidesActive = !isQuizActive;
                      
                      // Check if quiz should be disabled (still viewing slides, not unlocked yet)
                      const isQuizDisabled = hasQuiz && 
                                            progress?.status !== "quiz_unlocked" && 
                                            slidesViewed < slideCount;
                      
                      // Check for in-progress quiz attempt
                      const hasInProgressAttempt = inProgressQuizAttempts.has(topic.id) && 
                        inProgressQuizAttempts.get(topic.id) !== null;
                      
                      return (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Quiz Button - only show if topic has quiz */}
                          {hasQuiz && (
                            <Button
                              variant={isQuizActive ? "default" : "ghost"}
                              size="lg"
                              disabled={isQuizDisabled}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (isQuizDisabled) return;
                                
                                const topicSlug = createSlug(topic.title);
                                
                                if (hasInProgressAttempt) {
                                  const inProgressAttempt = inProgressQuizAttempts.get(topic.id);
                                  if (inProgressAttempt?.quizId) {
                                    // Fetch quiz to get title for slug
                                    try {
                                      const quizResult = await certificationApi.quizzes.byId(inProgressAttempt.quizId);
                                      if (quizResult.data) {
                                        const quizSlug = createSlug(quizResult.data.title);
                                        router.push(`/courses/${courseSlug}/${topicSlug}/quiz/${quizSlug}`);
                                      } else {
                                        router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                      }
                                    } catch (err) {
                                      console.error("Failed to fetch quiz:", err);
                                      router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                    }
                                  } else {
                                    router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                  }
                                } else if (quizStatus === "retry_available") {
                                  // For retry, fetch first quiz ID
                                  try {
                                    const quizzesResult = await certificationApi.quizzes.list(topic.id);
                                    if (quizzesResult.data && quizzesResult.data.length > 0) {
                                      const firstQuiz = quizzesResult.data[0];
                                      router.push(`/courses/${courseSlug}/${topicSlug}/quiz/${firstQuiz.id}`);
                                    } else {
                                      router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                    }
                                  } catch (err) {
                                    console.error("Failed to fetch quizzes:", err);
                                  }
                                } else {
                                  router.push(`/courses/${courseSlug}/${topicSlug}/quiz`);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2",
                                isQuizActive && "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 hover:text-white"
                              )}
                            >
                              <ClipboardList className="h-4 w-4" />
                              {quizStatus === "retry_available" 
                                ? "Retake Quiz"
                                : progress?.status === "quiz_unlocked"
                                  ? (hasInProgressAttempt ? "Continue Quiz" : "Start Quiz")
                                  : "Take Quiz"
                              }
                              {isQuizActive && (
                                <ChevronsRight className="h-4 w-4" style={{ animation: "bounce-right-subtle 1s ease-in-out infinite" }} />
                              )}
                            </Button>
                          )}
                          
                          {/* Review/View Slides Button - always last */}
                          {(() => {
                            // Determine if slides should be "Review" (after quiz unlocked/passed) or "View" (before)
                            const isQuizUnlockedOrPassed = progress?.status === "quiz_unlocked" || 
                                                           quizStatus === "passed" || 
                                                           (hasQuiz && slidesViewed === slideCount);
                            const slidesButtonText = isQuizUnlockedOrPassed ? "Review Slides" : "View Slides";
                            
                            return (
                              <Button
                                variant={isSlidesActive ? "default" : "ghost"}
                                size="lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const topicSlug = createSlug(topic.title);
                                  router.push(`/courses/${courseSlug}/${topicSlug}/slides`);
                                }}
                                className={cn(
                                  "flex items-center gap-2",
                                  isSlidesActive && "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 hover:text-white"
                                )}
                              >
                                <BookOpen className="h-4 w-4" />
                                {slidesButtonText}
                                {isSlidesActive && (
                                  <ChevronsRight className="h-4 w-4" style={{ animation: "bounce-right-subtle 1s ease-in-out infinite" }} />
                                )}
                              </Button>
                            );
                          })()}
                        </div>
                      );
                    })()}
                    {isRetryAvailable && (
                      <Button
                        variant="default"
                        size="lg"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const topicSlug = createSlug(topic.title);
                          try {
                            const quizzesResult = await certificationApi.quizzes.list(topic.id);
                            if (quizzesResult.data && quizzesResult.data.length > 0) {
                              const firstQuiz = quizzesResult.data[0];
                              router.push(`/courses/${courseSlug}/${topicSlug}/quiz/${firstQuiz.id}`);
                            }
                          } catch (err) {
                            console.error("Failed to fetch quizzes:", err);
                          }
                        }}
                        className="flex-shrink-0 bg-[var(--brand-bullyproof-secondary)] text-white hover:bg-[var(--brand-bullyproof-secondary)]/90 hover:text-white"
                      >
                        Retake Quiz
                      </Button>
                    )}
                  </div>
                );
              })}

              {/* Only show "Receive Certification" section if certification is not complete */}
              {!isCertificationComplete && (
                <>
                  {/* Separator before Certificate */}
                  <Separator className="my-4" />

                  {/* Certificate as Final Step */}
                  <div
                    className={cn(
                      "flex flex-row items-center gap-4 min-h-[200px] p-8 rounded-lg border transition-colors",
                      "opacity-50 hover:bg-accent/30"
                    )}
                  >
                    <div className="flex-shrink-0">
                      <Image
                        src="/images/ap-teacher-icon.svg"
                        alt="AP Logo"
                        width={64}
                        height={64}
                        className="opacity-50"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col">
                        <p className="text-4xl font-semibold text-muted-foreground">
                          Receive
                        </p>
                        <p className="text-4xl font-semibold text-muted-foreground">
                          Certification
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      ) : null}
    </div>
    </>
  );
}
