import { Card } from "@workspace/ui/components/card";
import { Calendar } from "@workspace/ui/components/calendar";
import { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, School, ChevronsRight, Plus } from "lucide-react";
import Image from "next/image";
import { Separator } from "@workspace/ui/components/separator";
import { StaggeredAnimation } from "@workspace/ui/components/atoms/staggered-animation";
import { useMeStore } from "@/entities/me/model/store";
import { HeroCard } from "@/entities/dashboard/ui/shared/hero-card";
import { useQuery } from "@tanstack/react-query";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { cn } from "@workspace/ui/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMySchoolsQuery } from "@/entities/me/model/useMySchoolsQuery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { LessonFeedbackForm, type LessonForFeedback } from "@/components/organisms/lesson-feedback-form";
import { checkFeatureAccessAndVisibleCached } from "@/utils/check-feature-access-cached";
import { getDisplayStatus, getStatusColors } from "@/utils/lesson-status";
import { CheckCheck } from "lucide-react";
import { useEffectiveUser } from "@/hooks/use-effective-user";
import { useSchoolsForUserQuery } from "@/entities/me/model/useMySchoolsQuery";

type LessonWithDetails = {
  id: string;
  schoolId: string;
  createdAt: string;
  scheduledFor?: string | null;
  topic?: {
    id: string;
    title: string;
  } | null;
  assignedClasses?: Array<{
    classId: string;
    className: string;
    classCode: string | null;
  }> | null;
  status: string;
};

export function TeacherHeroSection() {
  const router = useRouter();
  const [date, setDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSchoolDialogOpen, setIsSchoolDialogOpen] = useState(false);
  const [isPendingFeedbackOpen, setIsPendingFeedbackOpen] = useState(false);
  const [hasShownFeedbackDialog, setHasShownFeedbackDialog] = useState(false);
  const currentUser = useEffectiveUser();
  const teacherId = currentUser?.id;
  const viewAsUser = useMeStore((s) => s.viewAsUser);

  // Fetch user's schools
  const { data: mySchools = [], isLoading: isLoadingMySchools } = useMySchoolsQuery({
    limit: 50,
  });
  const { data: viewAsSchools = [], isLoading: isLoadingViewAsSchools } =
    useSchoolsForUserQuery(viewAsUser?.id ?? "", { limit: 100 });
  const schools = viewAsUser ? viewAsSchools : mySchools;
  const isLoadingSchools = viewAsUser ? isLoadingViewAsSchools : isLoadingMySchools;

  // Check if lessons feature is enabled for any of the user's schools
  const hasLessonsFeature = useMemo(() => {
    if (!currentUser?.featurePermissions || schools.length === 0) return false;
    
    // Check each school to see if lessons feature is enabled
    return schools.some((school) => {
      const { hasAccess } = checkFeatureAccessAndVisibleCached(
        currentUser.featurePermissions,
        "lessons",
        school.id,
        currentUser.roleIds
      );
      return hasAccess;
    });
  }, [currentUser?.featurePermissions, currentUser?.roleIds, schools]);

  const schoolsWithLessons = useMemo(() => {
    if (!currentUser?.featurePermissions || schools.length === 0) return [];
    return schools.filter((school) => {
      const { hasAccess } = checkFeatureAccessAndVisibleCached(
        currentUser.featurePermissions,
        "lessons",
        school.id,
        currentUser.roleIds
      );
      return hasAccess;
    });
  }, [currentUser?.featurePermissions, currentUser?.roleIds, schools]);

  // Fetch lessons in feedback status for the current teacher
  const { data: feedbackLessons = [], isLoading: isLoadingFeedbackLessons } = useQuery({
    queryKey: ["teacher-lessons-feedback", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const result = await lessonsApi.get.list({
        teacherId,
        status: "feedback",
        limit: 50,
      });

      if (result.error || !result.data) return [];

      // Fetch details for each lesson to get topic and classes info
      const lessonsWithDetails = await Promise.all(
        result.data.map(async (lesson) => {
          const lessonDetailResult = await lessonsApi.get.byId(lesson.id);
          if (lessonDetailResult.error || !lessonDetailResult.data) {
            return {
              id: lesson.id,
              topicId: lesson.topicId,
              topicTitle: "Untitled Lesson",
              stageOrder: null,
              stageName: undefined,
              assignedClasses: [],
            } as LessonForFeedback;
          }
          
          const detail = lessonDetailResult.data;
          return {
            id: lesson.id,
            topicId: lesson.topicId,
            topicTitle: detail.topic?.title || "Untitled Lesson",
            stageOrder: detail.topic?.stageOrder ?? null,
            stageName: detail.topic?.stageName,
            assignedClasses: detail.assignedClasses?.map((c) => ({
              classId: c.classId,
              className: c.className,
            })) || [],
          } as LessonForFeedback;
        })
      );

      return lessonsWithDetails;
    },
    enabled: !!teacherId && hasLessonsFeature,
    staleTime: 60 * 1000, // 1 minute
  });

  // Auto-open pending feedback dialog when there are lessons and feature is enabled
  useEffect(() => {
    if (
      !hasShownFeedbackDialog &&
      !isLoadingFeedbackLessons &&
      feedbackLessons.length > 0 &&
      hasLessonsFeature
    ) {
      setIsPendingFeedbackOpen(true);
      setHasShownFeedbackDialog(true);
    }
  }, [feedbackLessons, hasLessonsFeature, isLoadingFeedbackLessons, hasShownFeedbackDialog]);

  // Fetch lessons for the current teacher
  const { data: lessonsData, isLoading: isLoadingLessons } = useQuery({
    queryKey: ["teacher-lessons-calendar", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const result = await lessonsApi.get.list({
        teacherId,
        limit: 100, // Fetch enough lessons to cover the calendar
      });

      if (result.error || !result.data) return [];

      // Fetch details for each lesson to get topic and classes
      const lessonsWithDetails = await Promise.all(
        result.data.map(async (lesson) => {
          const lessonDetailResult = await lessonsApi.get.byId(lesson.id);
          if (lessonDetailResult.error || !lessonDetailResult.data) {
            return {
              ...lesson,
              topic: null,
              assignedClasses: [],
            } as LessonWithDetails;
          }
          
          return {
            ...lesson,
            topic: lessonDetailResult.data.topic,
            assignedClasses: lessonDetailResult.data.assignedClasses || [],
          } as LessonWithDetails;
        })
      );

      return lessonsWithDetails;
    },
    enabled: !!teacherId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Filter out cancelled lessons (match lessons page behavior)
  const nonCancelledLessons = useMemo(
    () => (lessonsData ?? []).filter((l) => l.status !== "cancelled"),
    [lessonsData]
  );

  // Only show lessons with scheduledFor or completed lessons
  const calendarVisibleLessons = useMemo(
    () =>
      nonCancelledLessons.filter(
        (l) => l.scheduledFor != null || l.status === "completed"
      ),
    [nonCancelledLessons]
  );

  // Group lessons by date (YYYY-MM-DD) using scheduledFor when available, else createdAt
  const lessonsByDate = useMemo(() => {
    const grouped: Record<string, LessonWithDetails[]> = {};

    calendarVisibleLessons.forEach((lesson) => {
      const dateSource = lesson.scheduledFor ?? lesson.createdAt;
      if (!dateSource) return;

      const lessonDate = new Date(dateSource);
      const year = lessonDate.getFullYear();
      const month = String(lessonDate.getMonth() + 1).padStart(2, "0");
      const day = String(lessonDate.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(lesson);
    });

    return grouped;
  }, [calendarVisibleLessons]);

  // Get dates that have lessons for calendar modifiers
  const datesWithLessons = useMemo(() => {
    return Object.keys(lessonsByDate).map((dateStr) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      // Create date at midnight local time to match calendar display
      const date = new Date(year, month - 1, day);
      return date;
    });
  }, [lessonsByDate]);

  // Get lessons for the selected date
  const selectedDateLessons = useMemo(() => {
    // Use local date to match the grouping key
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;
    return lessonsByDate[dateKey] || [];
  }, [date, lessonsByDate]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Get user role/title
  const userTitle = "Teacher";

  // Handle school selection from dialog
  const handleSchoolSelect = (schoolSlug: string) => {
    setIsSchoolDialogOpen(false);
    router.push(`/schools/${schoolSlug}/lessons?wizardOpen=true&step=0`);
  };

  return (
    <section className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
      <div className="col-span-2 flex flex-col gap-4">
        <StaggeredAnimation index={0} fadeDirection="down">
          <HeroCard
            currentTime={currentTime}
            userTitle={userTitle}
            defaultName="Teacher"
          />
        </StaggeredAnimation>

        <StaggeredAnimation
          index={1}
          fadeDirection="up"
          className="flex-1 min-h-0"
        >
          <Link href="/courses/amayda-program">
            <Card 
              className="group rotating-gradient-bg h-full flex flex-row items-center justify-center gap-3 p-4 cursor-pointer transition-all hover:brightness-110 hover:scale-[1.02] hover:shadow-lg"
              style={{
                boxShadow: '0 0 20px rgba(3, 132, 147, 0.3)',
              }}
            >
              <Image
                src="/images/ap-teacher-icon.svg"
                alt="AP Logo"
                width={48}
                height={48}
                className="shrink-0 group-hover:animate-shake-twice"
              />
              <p className="text-3xl font-normal text-white">Get <span className="font-black">AP Certified!</span> </p>
              <ChevronsRight className="size-8 animate-bounce-right text-white shrink-0" />
            </Card>
          </Link>
        </StaggeredAnimation>
      </div>

      <StaggeredAnimation index={2} fadeDirection="up" className="col-span-3">
        <Card className="h-full col-span-3 border px-4 py-2 flex flex-row gap-4">
          <div className="w-fit h-full flex items-start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-lg h-full"
              showOutsideDays={false}
              required
              modifiers={{
                hasLesson: datesWithLessons,
              }}
              modifiersClassNames={{
                hasLesson: "bg-primary/10 hover:bg-primary/20 rounded-md",
              }}
              classNames={{
                nav: "hidden",
                // month_caption: "hidden",
                dropdowns: "hidden",
              }}
            />
          </div>
          <div className="h-full py-12">
            <Separator orientation="vertical" className="" />
          </div>
          <div className="w-full flex flex-col h-full pl-2">
            {/* Events List */}
            <div className="flex flex-col gap-6 flex-1 pr-0">
              <div className="flex items-center gap-2 pt-4">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />

                <h3 className="font-medium text-sm text-muted-foreground">
                  {date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  {date.toDateString() === currentTime.toDateString() && (
                    <span className="ml-2 text-xs">
                      •{" "}
                      {currentTime.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  )}
                </h3>
              </div>

              {isLoadingLessons ? (
                <div className="w-full border-2 border-dotted rounded-lg bg-muted/30 flex items-center px-4 py-3">
                  <Skeleton className="h-4 w-48 flex-1" />
                </div>
              ) : selectedDateLessons.length === 0 ? (
                <div className="flex flex-col gap-4">
                  {/* Start new lesson - only when teacher has at least one school with lessons access */}
                  {schoolsWithLessons.length === 1 ? (
                    <Link href={`/schools/${schoolsWithLessons[0].slug}/lessons?wizardOpen=true&step=0`}>
                      <Button variant="outline" size="sm" className="w-full justify-center gap-2">
                        <Plus className="h-4 w-4" />
                        Start new lesson
                      </Button>
                    </Link>
                  ) : schoolsWithLessons.length > 1 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center gap-2"
                      onClick={() => setIsSchoolDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Start new lesson
                    </Button>
                  ) : null}
                  {/* Main card with text */}
                  <div className="w-full border-2 border-dotted rounded-lg bg-muted/30 flex items-center px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Your lessons will appear here!
                    </p>
                  </div>
                  {/* Gradient cards underneath */}
                  <div className="w-full border-2 border-dotted rounded-lg bg-muted/5 opacity-50 flex items-center px-4 py-6" />
                  <div className="w-full border-2 border-dotted rounded-lg bg-muted/5 opacity-50 flex items-center px-4 py-6" />
                  {/* <div className="w-full border-2 border-dotted rounded-lg bg-muted/10 flex items-center px-4 py-6" /> */}
                  {/* <div className="w-full border-2 border-dotted rounded-lg bg-muted/5 flex items-center px-4 py-6" /> */}
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[240px] overflow-y-auto pr-2">
                  {selectedDateLessons.map((lesson) => {
                    const dateForDisplay = lesson.scheduledFor ?? lesson.createdAt;
                    const lessonDate = dateForDisplay
                      ? new Date(dateForDisplay)
                      : null;
                    const timeStr = lessonDate
                      ? lessonDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "No time";

                    const rawDisplayStatus = getDisplayStatus(
                      lesson.status,
                      lesson.scheduledFor
                    );
                    const { bg: statusBg, dot: statusDot, border: statusBorder } =
                      getStatusColors(rawDisplayStatus);
                    const isCompleted = rawDisplayStatus === "completed";
                    const displayStatus = rawDisplayStatus
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase());

                    const schoolSlug = schools.find(
                      (s) => s.id === lesson.schoolId
                    )?.slug;

                    const cardContent = (
                      <div
                        className={cn(
                          "w-full rounded-lg border px-3 py-2.5 transition-colors",
                          statusBg,
                          isCompleted ? "border-border" : statusBorder,
                          schoolSlug && "hover:bg-accent/50 cursor-pointer"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs text-muted-foreground shrink-0">
                              {timeStr}
                            </span>
                            <span className="text-muted-foreground/60 shrink-0">•</span>
                            <p className="font-medium text-sm truncate">
                              {lesson.topic?.title || "Untitled Lesson"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 shrink-0 text-xs px-2 py-0.5 rounded-md font-medium border",
                              isCompleted
                                ? "bg-muted text-muted-foreground border-border"
                                : cn(statusBg, statusBorder)
                            )}
                          >
                            {isCompleted ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  statusDot,
                                  "animate-pulse"
                                )}
                              />
                            )}
                            {displayStatus}
                          </span>
                        </div>
                        {lesson.assignedClasses &&
                          lesson.assignedClasses.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {lesson.assignedClasses.map((assignedClass) => (
                              <span
                                key={assignedClass.classId}
                                className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary"
                              >
                                {assignedClass.className}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );

                    return (
                      <div key={lesson.id}>
                        {schoolSlug ? (
                          <Link
                            href={`/schools/${schoolSlug}/lessons/${lesson.id}`}
                            className="block"
                          >
                            {cardContent}
                          </Link>
                        ) : (
                          cardContent
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      </StaggeredAnimation>

      {/* School Selection Dialog */}
      <Dialog open={isSchoolDialogOpen} onOpenChange={setIsSchoolDialogOpen}>
        <DialogContent
          className="sm:max-w-md max-h-[65vh] flex flex-col"
          showCloseButton={true}
        >
          <DialogHeader className="text-center shrink-0">
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
              <School className="h-8 w-8" />
              Select a School
            </DialogTitle>
            <DialogDescription className="text-center">
              You are assigned to multiple schools. Choose which school you'd like to prepare a lesson for.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 py-2 pr-4">
              {isLoadingSchools ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {/* Solid circle */}
                        <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                        {/* Dotted box grid */}
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="h-4 border-2 border-dashed border-muted-foreground rounded-md w-3/4" />
                          <div className="flex items-center gap-2">
                            <div className="h-3 border-2 border-dashed border-muted-foreground rounded-md w-1/2" />
                            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              ) : schools.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No schools found</p>
                </div>
              ) : (
                schools.map((school) => (
                  <Card
                    key={school.id}
                    className={cn(
                      "px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/50",
                      "border-border"
                    )}
                    onClick={() => handleSchoolSelect(school.slug)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <School className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="font-medium text-sm truncate">
                          {school.name || "Unknown School"}
                        </span>
                        {school.slug && (
                          <span className="text-xs text-muted-foreground truncate">
                            {school.slug}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Pending Feedback Dialog */}
      {feedbackLessons.length > 0 && (
        <LessonFeedbackForm
          lessons={feedbackLessons}
          open={isPendingFeedbackOpen}
          onOpenChange={setIsPendingFeedbackOpen}
          onComplete={() => {
            setIsPendingFeedbackOpen(false);
            router.refresh();
          }}
          hideClosedState={true}
        />
      )}
    </section>
  );
}
