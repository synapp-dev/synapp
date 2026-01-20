import { Card } from "@workspace/ui/components/card";
import { Calendar } from "@workspace/ui/components/calendar";
import { useState, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import { LiveActivityFeed } from "./components/live-activity-feed";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { useMeStore } from "@/entities/me/model/store";
import { HeroCard } from "@/entities/dashboard/ui/shared/hero-card";

export function HeroSection() {
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

  // Get user role/title
  const getUserRoleDisplay = () => {
    if (!currentUser) return "Admin";

    // Helper to format role keys to display names
    const formatRoleKey = (key: string): string => {
      return key
        .split("_")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    };

    // Check platform roles first (prioritize PLATFORM_ADMIN)
    const platformRoles = currentUser.platformRoles;
    if (
      platformRoles &&
      Array.isArray(platformRoles) &&
      platformRoles.length > 0
    ) {
      // Prioritize PLATFORM_ADMIN if present
      if (platformRoles.includes("PLATFORM_ADMIN")) {
        return "Platform Admin";
      }
      // Return the first platform role formatted nicely
      return formatRoleKey(platformRoles[0]);
    }

    // Fall back to school roles
    const schoolRoles = currentUser.schoolRoles;
    if (schoolRoles && Array.isArray(schoolRoles) && schoolRoles.length > 0) {
      // Use roleName if available, otherwise format roleKey
      const firstRole = schoolRoles[0];
      if (firstRole.roleName) {
        return firstRole.roleName;
      }
      if (firstRole.roleKey) {
        return formatRoleKey(firstRole.roleKey);
      }
    }

    return "Admin";
  };

  const userTitle = getUserRoleDisplay();

  return (
    <section className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
      <div className="col-span-2 flex flex-col gap-4">
        <StaggeredAnimation index={0} fadeDirection="down">
          <HeroCard
            currentTime={currentTime}
            userTitle={userTitle}
            defaultName="Admin"
          />
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
