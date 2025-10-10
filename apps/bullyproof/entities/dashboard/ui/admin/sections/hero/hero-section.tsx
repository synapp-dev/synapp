import { Card, CardDescription } from "@workspace/ui/components/card";
import { CardHeader } from "@workspace/ui/components/card";
import { CardTitle } from "@workspace/ui/components/card";
import { CardContent } from "@workspace/ui/components/card";
import Image from "next/image";
import { Calendar } from "@workspace/ui/components/calendar";
import { useState, useEffect } from "react";
import {
  Brain,
  FileText,
  School,
  Users,
  Clock,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { LiveActivityFeed } from "./components/live-activity-feed";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

// Event type definition
interface Event {
  id: string;
  time: string;
  title: string;
  description: string;
  type: "lesson" | "meeting" | "activity" | "task";
}

// Event generation function
function generateEventsForDate(selectedDate: Date): Event[] {
  // Use date as seed for consistent events per date
  const seed = selectedDate.getTime();
  const random = (multiplier: number) => {
    const x = Math.sin(seed * multiplier) * 10000;
    return x - Math.floor(x);
  };

  const eventTemplates = [
    {
      title: "Anti-bullying Workshop",
      description:
        "Grade 6-8 students learn about empathy and conflict resolution",
      type: "lesson" as const,
    },
    {
      title: "Staff Meeting",
      description: "Weekly team sync on student progress and upcoming events",
      type: "meeting" as const,
    },
    {
      title: "Student Council Meeting",
      description: "Planning school spirit week activities",
      type: "activity" as const,
    },
    {
      title: "Parent-Teacher Conference",
      description: "Discuss student performance and behavior improvements",
      type: "meeting" as const,
    },
    {
      title: "Peer Mediation Training",
      description: "Students learn conflict resolution techniques",
      type: "lesson" as const,
    },
    {
      title: "School Assembly",
      description: "Monthly recognition ceremony for positive behavior",
      type: "activity" as const,
    },
    {
      title: "Review Incident Reports",
      description: "Analyze and follow up on reported bullying incidents",
      type: "task" as const,
    },
    {
      title: "Update Safety Protocols",
      description: "Review and update school safety procedures",
      type: "task" as const,
    },
    {
      title: "Student Support Group",
      description: "Weekly session for students dealing with social challenges",
      type: "activity" as const,
    },
    {
      title: "Curriculum Planning",
      description: "Plan next month's social-emotional learning modules",
      type: "lesson" as const,
    },
    {
      title: "Community Outreach",
      description: "Coordinate with local organizations for student programs",
      type: "task" as const,
    },
    {
      title: "Wellness Check-in",
      description: "One-on-one sessions with students who need extra support",
      type: "activity" as const,
    },
  ];

  const timeSlots = [
    "8:00 AM",
    "9:30 AM",
    "11:00 AM",
    "1:00 PM",
    "2:30 PM",
    "4:00 PM",
    "5:30 PM",
  ];

  // Generate 2-5 events
  const numEvents = Math.floor(random(1) * 4) + 2;
  const events: Event[] = [];

  for (let i = 0; i < numEvents; i++) {
    const templateIndex = Math.floor(random(i + 1) * eventTemplates.length);
    const timeIndex = Math.floor(random(i + 2) * timeSlots.length);
    const template = eventTemplates[templateIndex];
    const timeSlot = timeSlots[timeIndex];

    if (template && timeSlot) {
      events.push({
        id: `${selectedDate.getTime()}-${i}`,
        time: timeSlot,
        title: template.title,
        description: template.description,
        type: template.type,
      });
    }
  }

  // Sort events by time
  return events.sort((a, b) => {
    const timeA = timeSlots.indexOf(a.time);
    const timeB = timeSlots.indexOf(b.time);
    return timeA - timeB;
  });
}

// Badge variant mapping
const getBadgeVariant = (type: Event["type"]) => {
  switch (type) {
    case "lesson":
      return "default";
    case "meeting":
      return "secondary";
    case "activity":
      return "outline";
    case "task":
      return "destructive";
    default:
      return "default";
  }
};

// Badge color mapping
const getBadgeColor = (type: Event["type"]) => {
  switch (type) {
    case "lesson":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "meeting":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "activity":
      return "bg-green-100 text-green-800 border-green-200";
    case "task":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function HeroSection() {
  const [date, setDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

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

  return (
    <section className="grid grid-cols-1 md:grid-cols-5 gap-4 h-fit">
      <div className="col-span-2 flex flex-col gap-4">
        <StaggeredAnimation index={0} fadeDirection="down">
          <Card className="h-full relative overflow-visible col-span-2 min-h-52">
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
                  Aaron <span className="font-black">Girton</span>
                </h1>
                <h2 className="text-muted-foreground">Platform Developer</h2>
              </div>

              {/* Profile Image - positioned to ignore card padding and bleed above */}
              <div className="absolute -top-4 sm:-top-6 md:-top-3 bottom-0 right-0 w-36 sm:w-44 md:w-56 pointer-events-none">
                <div className="relative h-full w-full">
                  <Image
                    src="/images/user/aaron-girton.png"
                    alt="User Profile"
                    fill
                    className="object-top object-contain drop-shadow-xl"
                    priority
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>

        <StaggeredAnimation index={1} fadeDirection="up">
          <Card>
            <LiveActivityFeed />
          </Card>
        </StaggeredAnimation>
      </div>

      <StaggeredAnimation index={2} fadeDirection="up" className="col-span-3">
        <Card className="h-full col-span-3 border px-2 py-0 flex flex-row gap-4">
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
          <div className="w-full flex flex-col h-full">
            {/* Events List */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-w-2/3">
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

              {(() => {
                const events = generateEventsForDate(date);

                if (events.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CalendarIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No events scheduled for this day
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try selecting a different date
                      </p>
                    </div>
                  );
                }

                return events.map((event, index) => (
                  <StaggeredAnimation key={event.id} index={index}>
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {event.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                        <Badge
                          variant={getBadgeVariant(event.type)}
                          className={`text-xs px-1.5 py-0.5 flex-shrink-0 ${getBadgeColor(event.type)}`}
                        >
                          {event.type}
                        </Badge>
                        <h4 className="font-medium text-sm truncate min-w-0">
                          {event.title}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate min-w-0 max-w-1/3">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  </StaggeredAnimation>
                ));
              })()}
            </div>
          </div>
        </Card>
      </StaggeredAnimation>
    </section>
  );
}
