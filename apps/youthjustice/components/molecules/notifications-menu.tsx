"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import {
  NotificationKindBadge,
} from "@/components/molecules/notification-kind";
import { useNotificationsDemo } from "@/components/organisms/notifications-demo-context";

export function NotificationsMenu() {
  const { unreadMessageCount, recentNotifications, latestAnimatedNotificationId } =
    useNotificationsDemo();
  const unreadCount = unreadMessageCount;
  const unreadLabel = `${unreadCount} new message${unreadCount === 1 ? "" : "s"}`;

  const triggerButton = (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      aria-label="Open notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-2 text-[10px] font-semibold leading-none text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Button>
  );

  return (
    <>
      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)]">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 ? (
                <span className="text-xs text-muted-foreground">{unreadLabel}</span>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentNotifications.map((notification) => (
              <DropdownMenuItem key={notification.id} asChild>
                <Link
                  href={notification.href}
                  className={`flex items-start gap-3 py-2 ${notification.id === latestAnimatedNotificationId ? "animate-in slide-in-from-top-2 fade-in-0 duration-500" : ""}`}
                >
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        {notification.isUnread ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        ) : null}
                        <span className="truncate text-sm font-medium">{notification.title}</span>
                      </span>
                      <NotificationKindBadge kind={notification.kind} className="shrink-0" />
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {notification.timeLabel}
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>{triggerButton}</SheetTrigger>
          <SheetContent
            side="top"
            className="inset-x-2 top-0 gap-0 overflow-hidden rounded-b-2xl border px-0 pb-0 sm:inset-x-4"
          >
            <SheetHeader className="pb-3">
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                {unreadCount > 0 ? unreadLabel : "No new messages"}
              </SheetDescription>
            </SheetHeader>
            <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
              <div className="grid gap-1">
                {recentNotifications.map((notification) => (
                  <SheetClose key={notification.id} asChild>
                    <Link
                      href={notification.href}
                      className={`hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-start rounded-md px-2 py-2 outline-none transition-colors ${notification.id === latestAnimatedNotificationId ? "animate-in slide-in-from-top-2 fade-in-0 duration-500" : ""}`}
                    >
                      <span className="grid min-w-0 flex-1 gap-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            {notification.isUnread ? (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                            ) : null}
                            <span className="truncate text-sm font-medium">
                              {notification.title}
                            </span>
                          </span>
                          <NotificationKindBadge
                            kind={notification.kind}
                            className="shrink-0"
                          />
                        </span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {notification.timeLabel}
                        </span>
                      </span>
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
