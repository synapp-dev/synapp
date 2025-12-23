import { Card, CardDescription } from "@workspace/ui/components/card";
import { CardHeader } from "@workspace/ui/components/card";
import { CardTitle } from "@workspace/ui/components/card";
import { CardContent } from "@workspace/ui/components/card";
import Image from "next/image";
import { Calendar } from "@workspace/ui/components/calendar";
import { useState, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { LiveActivityFeed } from "@/entities/dashboard/ui/admin/sections/hero/components/live-activity-feed";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { useMeStore } from "@/entities/me/model/store";

export function TeacherHeroSection() {
  const [date, setDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const currentUser = useMeStore((s) => s.currentUser);

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
              <div className="absolute -top-4 sm:-top-6 md:-top-3 bottom-0 right-0 w-36 sm:w-44 md:w-56 pointer-events-none">
                <div className="relative h-full w-full">
                  <Image
                    src="/images/user/teacher-default.png"
                    alt="User Profile"
                    fill
                    className="object-top object-contain drop-shadow-xl"
                    priority
                    style={{ transform: "scaleX(-1)" }}
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
          <Card className="h-full flex flex-col">
            <LiveActivityFeed />
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
            <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-0">
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

              <div className="w-full border-dashed rounded-lg bg-muted flex items-center px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  No events currently scheduled
                </p>
              </div>
            </div>
          </div>
        </Card>
      </StaggeredAnimation>
    </section>
  );
}
