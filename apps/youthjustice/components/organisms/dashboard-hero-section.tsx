"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "@workspace/ui/components/calendar";
import { Card } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Calendar as CalendarIcon } from "lucide-react";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import {
  getNotificationKindMeta,
  NotificationKindBadge,
} from "@/components/molecules/notification-kind";
import { DashboardHeroCard } from "@/components/organisms/dashboard-hero-card";
import { useMessagesDemo } from "@/components/organisms/messages-demo-context";
import { useNotificationsDemo } from "@/components/organisms/notifications-demo-context";

export function DashboardHeroSection() {
  const [date, setDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const { resetDemoState: resetMessagesDemoState, startRebeccaLiveScenario } =
    useMessagesDemo();
  const {
    recentNotifications,
    latestAnimatedNotificationId,
    resetDemoState: resetNotificationsDemoState,
    triggerDashboardNotificationScenario,
  } = useNotificationsDemo();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    resetMessagesDemoState();
    resetNotificationsDemoState();
    startRebeccaLiveScenario();
    triggerDashboardNotificationScenario();
  }, [
    resetMessagesDemoState,
    resetNotificationsDemoState,
    startRebeccaLiveScenario,
    triggerDashboardNotificationScenario,
  ]);

  return (
    <section className="grid grid-cols-1 gap-4 overflow-visible lg:grid-cols-5 lg:items-stretch">
      <div className="flex flex-col gap-4 overflow-visible pt-3 sm:pt-4 lg:col-span-2">
        <StaggeredAnimation
          index={0}
          fadeDirection="down"
          className="overflow-visible"
        >
          <DashboardHeroCard currentTime={currentTime} />
        </StaggeredAnimation>
        <StaggeredAnimation
          index={1}
          fadeDirection="up"
          className="overflow-visible lg:hidden"
        >
          <Card className="border px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Recent notifications</h3>
              <span className="text-xs text-muted-foreground">Last 5</span>
            </div>
            <div className="space-y-2">
              {recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  className={`hover:bg-accent/40 focus-visible:ring-ring block rounded-md border px-3 py-2 text-inherit no-underline transition-colors focus-visible:ring-2 focus-visible:outline-none ${getNotificationKindMeta(notification.kind).cardClassName} ${notification.id === latestAnimatedNotificationId ? "animate-in slide-in-from-top-2 fade-in-0 duration-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {notification.isUnread ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      ) : null}
                      <p className="line-clamp-1 text-sm font-medium">
                        {notification.title}
                      </p>
                    </span>
                    <NotificationKindBadge kind={notification.kind} className="mt-0.5 shrink-0" />
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {notification.timeLabel}
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        </StaggeredAnimation>
      </div>

      <StaggeredAnimation
        index={2}
        fadeDirection="up"
        className="min-h-0 lg:col-span-3"
      >
        <Card className="flex h-full min-h-0 flex-col gap-4 border px-4 py-2 lg:flex-row lg:gap-4">
          <div className="flex w-full shrink-0 justify-center lg:w-fit lg:justify-start lg:self-start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              required
              className="h-full rounded-lg p-1 [--cell-size:--spacing(10)] sm:p-2 sm:[--cell-size:--spacing(8)]"
              showOutsideDays={false}
              classNames={{
                root: "w-full",
                nav: "hidden",
                dropdowns: "hidden",
              }}
            />
          </div>

          <div className="hidden h-full shrink-0 py-12 lg:block">
            <Separator orientation="vertical" />
          </div>

          <Separator className="lg:hidden" />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-2">
            <div className="flex flex-col gap-6 overflow-y-auto pr-0">
              <div className="flex flex-wrap items-center gap-2 pt-0 lg:pt-4">
                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  {date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  {date.toDateString() === currentTime.toDateString() ? (
                    <span className="ml-2 text-xs">
                      •{" "}
                      {currentTime.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  ) : null}
                </h3>
              </div>

              <div className="flex w-full items-center rounded-lg border-dashed bg-muted px-4 py-3">
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
