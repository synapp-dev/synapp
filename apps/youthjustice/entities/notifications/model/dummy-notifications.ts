"use client";

export type YouthJusticeNotificationKind =
  | "message"
  | "reminder"
  | "form"
  | "case-update";

export type YouthJusticeNotification = {
  id: string;
  kind: YouthJusticeNotificationKind;
  title: string;
  message: string;
  timeLabel: string;
  isUnread: boolean;
  href: string;
};

export const DUMMY_NOTIFICATIONS: YouthJusticeNotification[] = [
  {
    id: "notif-1",
    kind: "message",
    title: "New message from Alex W",
    message: "Can we meet before court this afternoon?",
    timeLabel: "2 mins ago",
    isUnread: true,
    href: "/messages",
  },
  {
    id: "notif-2",
    kind: "reminder",
    title: "Court Attendance in 30 mins",
    message: "Melbourne Children's Court, Room 3.",
    timeLabel: "5 mins ago",
    isUnread: true,
    href: "/dashboard",
  },
  {
    id: "notif-3",
    kind: "form",
    title: "Alex W has submitted Safety Form",
    message: "Review and acknowledge the updated responses.",
    timeLabel: "12 mins ago",
    isUnread: true,
    href: "/dashboard",
  },
  {
    id: "notif-4",
    kind: "message",
    title: "New message from Jamie L",
    message: "I uploaded the supporting documents you requested.",
    timeLabel: "18 mins ago",
    isUnread: true,
    href: "/messages",
  },
  {
    id: "notif-5",
    kind: "case-update",
    title: "Case plan updated for Jordan K",
    message: "Family conference notes were added.",
    timeLabel: "43 mins ago",
    isUnread: false,
    href: "/dashboard",
  },
  {
    id: "notif-6",
    kind: "message",
    title: "New message from Priya R",
    message: "Thanks for checking in. I can make Friday morning.",
    timeLabel: "1 hr ago",
    isUnread: false,
    href: "/messages",
  },
  {
    id: "notif-7",
    kind: "reminder",
    title: "Transport booking confirmed",
    message: "Pickup scheduled for tomorrow at 8:20 AM.",
    timeLabel: "2 hrs ago",
    isUnread: false,
    href: "/dashboard",
  },
];

export function getUnreadMessageNotificationCount(): number {
  return DUMMY_NOTIFICATIONS.filter(
    (notification) => notification.kind === "message" && notification.isUnread,
  ).length;
}

export function getRecentNotifications(limit: number): YouthJusticeNotification[] {
  return DUMMY_NOTIFICATIONS.slice(0, limit);
}
