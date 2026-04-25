"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  DUMMY_NOTIFICATIONS,
  type YouthJusticeNotification,
} from "@/entities/notifications/model/dummy-notifications";

type NotificationsDemoContextValue = {
  notifications: YouthJusticeNotification[];
  recentNotifications: YouthJusticeNotification[];
  unreadMessageCount: number;
  latestAnimatedNotificationId: string | null;
  resetDemoState: () => void;
  triggerDashboardNotificationScenario: () => void;
};

const NotificationsDemoContext = createContext<NotificationsDemoContextValue | null>(
  null,
);

const LIVE_MESSAGE_TEXT = "Aaron, where are you?";

export function NotificationsDemoProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<YouthJusticeNotification[]>(
    DUMMY_NOTIFICATIONS,
  );
  const [visibleRecentCount, setVisibleRecentCount] = useState(5);
  const [latestAnimatedNotificationId, setLatestAnimatedNotificationId] = useState<
    string | null
  >(null);
  const hasTriggeredDashboardScenarioRef = useRef(false);
  const insertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pruneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (insertTimerRef.current) clearTimeout(insertTimerRef.current);
    if (pruneTimerRef.current) clearTimeout(pruneTimerRef.current);
    if (clearAnimationTimerRef.current) clearTimeout(clearAnimationTimerRef.current);
    insertTimerRef.current = null;
    pruneTimerRef.current = null;
    clearAnimationTimerRef.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const triggerDashboardNotificationScenario = useCallback(() => {
    if (hasTriggeredDashboardScenarioRef.current) return;
    hasTriggeredDashboardScenarioRef.current = true;
    clearTimers();

    insertTimerRef.current = setTimeout(() => {
      const liveNotification: YouthJusticeNotification = {
        id: `notif-live-${Date.now()}`,
        kind: "message",
        title: "New message from Rebecca King",
        message: LIVE_MESSAGE_TEXT,
        timeLabel: "now",
        isUnread: true,
        href: "/messages/rebecca-king",
      };

      setNotifications((prev) => [liveNotification, ...prev]);
      setVisibleRecentCount(6);
      setLatestAnimatedNotificationId(liveNotification.id);

      clearAnimationTimerRef.current = setTimeout(() => {
        setLatestAnimatedNotificationId(null);
      }, 1200);
    }, 1100);

    pruneTimerRef.current = setTimeout(() => {
      setNotifications((prev) => {
        if (prev.length <= 5) return prev;
        return prev.filter((_, index) => index !== 5);
      });
      setVisibleRecentCount(5);
    }, 3600);
  }, [clearTimers]);

  const resetDemoState = useCallback(() => {
    clearTimers();
    hasTriggeredDashboardScenarioRef.current = false;
    setNotifications(DUMMY_NOTIFICATIONS);
    setVisibleRecentCount(5);
    setLatestAnimatedNotificationId(null);
  }, [clearTimers]);

  const unreadMessageCount = useMemo(
    () =>
      notifications.filter(
        (notification) => notification.kind === "message" && notification.isUnread,
      ).length,
    [notifications],
  );

  const recentNotifications = useMemo(
    () => notifications.slice(0, visibleRecentCount),
    [notifications, visibleRecentCount],
  );

  const value = useMemo(
    () => ({
      notifications,
      recentNotifications,
      unreadMessageCount,
      latestAnimatedNotificationId,
      resetDemoState,
      triggerDashboardNotificationScenario,
    }),
    [
      notifications,
      recentNotifications,
      unreadMessageCount,
      latestAnimatedNotificationId,
      resetDemoState,
      triggerDashboardNotificationScenario,
    ],
  );

  return (
    <NotificationsDemoContext.Provider value={value}>
      {children}
    </NotificationsDemoContext.Provider>
  );
}

export function useNotificationsDemo(): NotificationsDemoContextValue {
  const ctx = useContext(NotificationsDemoContext);
  if (!ctx) {
    throw new Error(
      "useNotificationsDemo must be used within NotificationsDemoProvider",
    );
  }
  return ctx;
}
