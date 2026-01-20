'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import {
  CheckCircle2,
  Lock,
  PlayCircle,
  Award,
  Download,
  Eye,
  FileText,
  Target,
  RotateCw,
  Trophy,
} from "lucide-react";
import { useMeStore } from "@/entities/me/model/store";
import { useMySchoolsQuery } from "@/entities/me/model/useMySchoolsQuery";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@workspace/ui/components/carousel";
import { useEffect, useState } from "react";

const quizRules = [
  {
    icon: FileText,
    description: "Each topic includes a short quiz.",
  },
  {
    icon: Target,
    description: "You need at least 3 out of 5 correct to pass.",
  },
  {
    icon: RotateCw,
    description: "You can retake quizzes as many times as needed.",
  },
  {
    icon: Trophy,
    description: "Only completion status matters for certification.",
  },
];

function QuizRulesCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api]);

  return (
    <Carousel
      setApi={setApi}
      className="w-full"
      opts={{
        align: "start",
        loop: true,
      }}
    >
      <CarouselContent>
        {quizRules.map((rule, index) => {
          const Icon = rule.icon;
          return (
            <CarouselItem key={index}>
              <Card className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-8">
                <div className="flex flex-col items-center justify-center gap-6 w-full">
                  <Icon className="h-16 w-16 text-primary" />
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {rule.description}
                  </p>
                </div>
              </Card>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}

export default function APCertificationPage() {
  const currentUser = useMeStore((s) => s.currentUser);
  
  // Get user's schools
  const { data: schools = [] } = useMySchoolsQuery({
    limit: 1,
  });

  // Get user name
  const firstName = currentUser?.firstName || "";
  const lastName = currentUser?.lastName || "";
  const userName =
    currentUser?.fullName ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "User";

  // Get user role
  const userRole = currentUser?.schoolRoles?.[0]?.roleName || 
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

  // Dummy data - in progress state
  const completedTopics = 5;
  const totalTopics = 8;
  const currentTopicNumber = 6;
  const currentTopicTitle = "Topic 6: Advanced Strategies";
  const slidesViewed = 12;
  const totalSlides = 12;
  const quizStatus: "not_attempted" | "passed" | "retry_available" =
    "not_attempted";
  const isCertificationComplete = false;

  // Topic statuses: "completed" | "current" | "locked"
  const topicStatuses: Array<"completed" | "current" | "locked"> = [
    "completed",
    "completed",
    "completed",
    "completed",
    "completed",
    "current",
    "locked",
    "locked",
  ];

  return (
    <div className="h-full w-full flex flex-col gap-6 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* User Info Card - 2/5 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <CardDescription className="text-xs uppercase tracking-wide mb-1">
                Name
              </CardDescription>
              <p className="text-base font-medium">{userName}</p>
            </div>
            <div>
              <CardDescription className="text-xs uppercase tracking-wide mb-1">
                School
              </CardDescription>
              <p className="text-base font-medium">{schoolName}</p>
            </div>
            <div>
              <CardDescription className="text-xs uppercase tracking-wide mb-1">
                Role
              </CardDescription>
              <p className="text-base font-medium">{userRole}</p>
            </div>
            <div>
              <CardDescription className="text-xs uppercase tracking-wide mb-1">
                Start Date
              </CardDescription>
              <p className="text-base font-medium">{startDate}</p>
            </div>
          </CardContent>
        </Card>

        {/* Hero Card - Certification Status - 3/5 width */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex gap-6">
              {/* Greeting Section - 1/4 width */}
              <div className="w-1/4 flex flex-col justify-center">
                <CardDescription className="text-base">
                  {getGreeting()}, {userName}
                </CardDescription>
              </div>
              {/* Progress Section - 3/4 width */}
              <div className="w-3/4">
                <CardTitle className="text-2xl">AP Certification Progress</CardTitle>
              </div>
            </div>
          </CardHeader>
        <CardContent className="space-y-4">
          {/* Segmented Progress Bar */}
          <div className="flex gap-1">
            {Array.from({ length: totalTopics }).map((_, index) => {
              const topicNum = index + 1;
              const isCompleted = topicNum <= completedTopics;
              const isCurrent = topicNum === currentTopicNumber;
              const isLocked = topicNum > currentTopicNumber;

              return (
                <div
                  key={index}
                  className={cn(
                    "flex-1 h-12 rounded-md transition-all",
                    isCompleted && "bg-primary",
                    isCurrent && "bg-primary ring-2 ring-primary ring-offset-2",
                    isLocked && "bg-muted opacity-50"
                  )}
                />
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="text-lg font-medium">
              {completedTopics} of {totalTopics} topics completed
            </p>
            <p className="text-sm text-muted-foreground">
              {isCertificationComplete
                ? "Certification completed."
                : "You're partway through the AP Certification."}
            </p>
          </div>
        </CardContent>
        <CardFooter>
          {isCertificationComplete ? (
            <Button size="lg" className="w-full">
              <Award className="mr-2 h-4 w-4" />
              View Certificate
            </Button>
          ) : (
            <Button size="lg" className="w-full">
              Continue Topic {currentTopicNumber}
            </Button>
          )}
        </CardFooter>
      </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Current Topic Card */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Current Topic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">
                Topic {currentTopicNumber}: {currentTopicTitle}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Slides viewed
                </span>
                <span className="text-sm font-medium">
                  {slidesViewed} / {totalSlides}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Quiz status
                </span>
                <span className="text-sm font-medium">
                  {quizStatus === "not_attempted"
                    ? "Not attempted"
                    : quizStatus === "passed"
                      ? (
                          <span className="text-green-600 dark:text-green-400">
                            Passed
                          </span>
                        )
                      : "Retry available"}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {quizStatus === "not_attempted"
              ? slidesViewed === totalSlides
                ? (
                    <Button className="w-full" size="lg">
                      Take Quiz
                    </Button>
                  )
                : (
                    <Button className="w-full" size="lg">
                      Continue Topic
                    </Button>
                  )
              : quizStatus === "passed"
                ? (
                    <Button className="w-full" size="lg" variant="outline">
                      Review slides
                    </Button>
                  )
                : (
                    <Button className="w-full" size="lg">
                      Retake Quiz
                    </Button>
                  )}
          </CardFooter>
        </Card>

        {/* Quiz Rules Carousel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How quizzes work</CardTitle>
          </CardHeader>
          <CardContent>
            <QuizRulesCarousel />
          </CardContent>
        </Card>
      </div>

      {/* Topic Timeline - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topicStatuses.map((status, index) => {
              const topicNum = index + 1;
              const topicTitles = [
                "Topic 1: Introduction",
                "Topic 2: Fundamentals",
                "Topic 3: Core Concepts",
                "Topic 4: Practical Applications",
                "Topic 5: Advanced Techniques",
                "Topic 6: Advanced Strategies",
                "Topic 7: Mastery Level",
                "Topic 8: Certification",
              ];

              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {status === "completed" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    {status === "current" && (
                      <PlayCircle className="h-5 w-5 text-primary" />
                    )}
                    {status === "locked" && (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{topicTitles[index]}</p>
                  </div>
                  {status === "completed" && (
                    <Button variant="ghost" size="sm">
                      Review slides
                    </Button>
                  )}
                </div>
              );
            })}

            {/* Separator before Certificate */}
            <Separator className="my-4" />

            {/* Certificate as Final Step */}
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-4 min-h-[200px] p-8 rounded-lg border transition-colors",
                isCertificationComplete
                  ? "hover:bg-accent/50"
                  : "opacity-50 hover:bg-accent/30"
              )}
            >
              <div className="flex-shrink-0">
                {isCertificationComplete ? (
                  <Award className="h-12 w-12 text-primary" />
                ) : (
                  <Award className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-lg font-semibold",
                    isCertificationComplete
                      ? ""
                      : "text-muted-foreground"
                  )}
                >
                  Receive Certification
                </p>
              </div>
              {isCertificationComplete && (
                <div className="flex gap-2 mt-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View Certificate
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}