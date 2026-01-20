import { Card, CardDescription } from "@workspace/ui/components/card";
import { CardHeader } from "@workspace/ui/components/card";
import { CardTitle } from "@workspace/ui/components/card";
import { CardContent } from "@workspace/ui/components/card";
import Image from "next/image";
import { Calendar } from "@workspace/ui/components/calendar";
import { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, BookOpen, Plus, WandSparkles } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { Button } from "@workspace/ui/components/button";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { useMeStore } from "@/entities/me/model/store";
import { useQuery } from "@tanstack/react-query";
import { lessonsApi } from "@/entities/lessons/api/endpoints";
import { cn } from "@workspace/ui/lib/utils";
import { useSchoolStore } from "@/stores/school-store";
import { LessonWizard } from "@/components/organisms/lesson-wizard";
import { getDisplayStatus } from "@/utils/lesson-status";

type LessonWithDetails = {
  id: string;
  createdAt: string;
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
  const [date, setDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const currentUser = useMeStore((s) => s.currentUser);
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const teacherId = currentUser?.id;
  const schoolSlug = currentSchool?.slug || "";

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

  // Group lessons by date (YYYY-MM-DD) using local time based on createdAt
  const lessonsByDate = useMemo(() => {
    const grouped: Record<string, LessonWithDetails[]> = {};
    
    lessonsData?.forEach((lesson) => {
      if (!lesson.createdAt) return;
      
      const lessonDate = new Date(lesson.createdAt);
      // Normalize to local date at midnight for consistent grouping
      const year = lessonDate.getFullYear();
      const month = String(lessonDate.getMonth() + 1).padStart(2, "0");
      const day = String(lessonDate.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`; // YYYY-MM-DD
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(lesson);
    });
    
    return grouped;
  }, [lessonsData]);

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

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 17) return "Good afternoon!";
    return "Good evening!";
  };

  // Get user name
  const firstName = currentUser?.firstName || "";
  const lastName = currentUser?.lastName || "";
  const fullName =
    currentUser?.fullName ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Teacher";
  const nameParts = fullName.split(" ");
  const displayFirstName = nameParts[0] || "";
  const displayLastName = nameParts.slice(1).join(" ") || "";

  // Get user role/title
  const userTitle = "Teacher";

  // Get avatar URL
  const avatarUrl = currentUser?.avatarUrl || "/images/default-avatar.svg";

  return (
    <section className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
      <div className="col-span-2 flex flex-col gap-4">
        <StaggeredAnimation index={0} fadeDirection="down">
          <Card className="relative overflow-visible col-span-2 min-h-52 flex-shrink-0">
            <CardHeader>
              <CardTitle>{getGreeting()}</CardTitle>
              <CardDescription>
                <div>
                  {currentTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div>
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-end h-full gap-4">
              <div className="flex flex-col gap-0 h-full justify-end items-start">
                <h1 className="text-3xl font-medium">
                  {displayFirstName}{" "}
                  {displayLastName && (
                    <span className="font-black">{displayLastName}</span>
                  )}
                </h1>
                <h2 className="text-muted-foreground">{userTitle}</h2>
              </div>

              {/* Profile Image - positioned to ignore card padding and bleed above */}
              <div className="absolute bottom-0 right-4 w-48 h-full pointer-events-none">
                <div className="relative h-full w-full">
                  <Image
                    src="/images/bp-man/bp-man-thumbsup.svg"
                    alt="BP-Man Thumbs Up"
                    fill
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>

        <StaggeredAnimation
          index={1}
          fadeDirection="up"
          className="flex-1 min-h-0"
        >
          <Card className="h-full flex flex-col items-center justify-center p-6">
            <Button
              onClick={() => setIsWizardOpen(true)}
              className="w-full h-auto py-8 text-lg font-medium text-white hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: "var(--brand-bullyproof-primary)",
              }}
            >
              <WandSparkles className="mr-2 h-5 w-5" />
              Prepare New Lesson
            </Button>
          </Card>
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
                <div className="w-full border-dashed rounded-lg bg-muted flex items-center px-4 py-3">
                  <p className="text-sm text-muted-foreground">Loading lessons...</p>
                </div>
              ) : selectedDateLessons.length === 0 ? (
                <div className="w-full border-dashed rounded-lg bg-muted flex items-center px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    No events currently scheduled
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[240px] overflow-y-auto pr-2">
                  {selectedDateLessons.map((lesson) => {
                    const lessonDate = lesson.createdAt
                      ? new Date(lesson.createdAt)
                      : null;
                    const timeStr = lessonDate
                      ? lessonDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "No time";

                    return (
                      <div
                        key={lesson.id}
                        className="w-full border rounded-lg bg-card p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">
                                {lesson.topic?.title || "Untitled Lesson"}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {timeStr}
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
                            <div className="mt-2">
                              <span
                                className={cn(
                                  "text-xs px-2 py-0.5 rounded-md",
                                  lesson.status === "completed"
                                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                    : lesson.status === "in_progress"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : lesson.status === "feedback"
                                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {lesson.status
                                  .split("_")
                                  .map(
                                    (word) =>
                                      word.charAt(0).toUpperCase() +
                                      word.slice(1)
                                  )
                                  .join(" ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      </StaggeredAnimation>

      {schoolSlug && (
        <LessonWizard
          schoolId={schoolSlug}
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
        />
      )}
    </section>
  );
}
