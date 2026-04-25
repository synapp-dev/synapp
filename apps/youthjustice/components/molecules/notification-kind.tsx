"use client";

import { Bell, Clock3, FileText, MessageSquare, RefreshCw, type LucideIcon } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { type YouthJusticeNotificationKind } from "@/entities/notifications/model/dummy-notifications";

type NotificationKindMeta = {
  label: string;
  Icon: LucideIcon;
  accentClassName: string;
  badgeClassName: string;
  cardClassName: string;
};

const NOTIFICATION_KIND_META: Record<YouthJusticeNotificationKind, NotificationKindMeta> = {
  message: {
    label: "Message",
    Icon: MessageSquare,
    accentClassName: "text-primary",
    badgeClassName:
      "border-primary/20 bg-primary/[0.01] text-primary hover:bg-primary/[0.01]",
    cardClassName: "border-primary/15 bg-primary/[0.01]",
  },
  reminder: {
    label: "Reminder",
    Icon: Clock3,
    accentClassName: "text-amber-500 dark:text-amber-300",
    badgeClassName:
      "border-amber-500/20 bg-amber-500/[0.01] text-amber-700 hover:bg-amber-500/[0.01] dark:text-amber-300",
    cardClassName: "border-amber-500/15 bg-amber-500/[0.01]",
  },
  form: {
    label: "Form",
    Icon: FileText,
    accentClassName: "text-emerald-600 dark:text-emerald-300",
    badgeClassName:
      "border-emerald-500/20 bg-emerald-500/[0.01] text-emerald-700 hover:bg-emerald-500/[0.01] dark:text-emerald-300",
    cardClassName: "border-emerald-500/15 bg-emerald-500/[0.01]",
  },
  "case-update": {
    label: "Case update",
    Icon: RefreshCw,
    accentClassName: "text-muted-foreground",
    badgeClassName:
      "border-muted-foreground/20 bg-muted/20 text-muted-foreground hover:bg-muted/20",
    cardClassName: "border-muted-foreground/15 bg-muted/15",
  },
};

export function getNotificationKindMeta(kind: YouthJusticeNotificationKind): NotificationKindMeta {
  return NOTIFICATION_KIND_META[kind] ?? {
    label: "Notification",
    Icon: Bell,
    accentClassName: "text-muted-foreground",
    badgeClassName:
      "border-muted-foreground/20 bg-muted/20 text-muted-foreground hover:bg-muted/20",
    cardClassName: "border-muted-foreground/15 bg-muted/15",
  };
}

export function NotificationTypeIcon({
  kind,
  className,
}: {
  kind: YouthJusticeNotificationKind;
  className?: string;
}) {
  const { Icon, accentClassName } = getNotificationKindMeta(kind);
  return <Icon className={cn("h-4 w-4", accentClassName, className)} />;
}

export function NotificationKindBadge({
  kind,
  className,
}: {
  kind: YouthJusticeNotificationKind;
  className?: string;
}) {
  const { label, Icon, accentClassName, badgeClassName } = getNotificationKindMeta(kind);
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-semibold",
        badgeClassName,
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", accentClassName)} />
      {label}
    </Badge>
  );
}
