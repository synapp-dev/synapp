import {
  ArrowLeftRight,
  Banknote,
  CalendarCheck,
  FileText,
  Receipt,
  Repeat,
  Shirt,
  SunMedium,
  TrendingUp,
  UserCog,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import {
  REQUEST_ACCENT,
  REQUEST_STATUS_LABEL,
  STATUS_TONE_CLASS,
  kindConfig,
  requestStatusTone,
  type RequestKind,
  type RequestStatus,
} from "@/lib/requests/config";

const ICONS: Record<string, LucideIcon> = {
  SunMedium,
  CalendarCheck,
  ArrowLeftRight,
  Repeat,
  TrendingUp,
  Banknote,
  ReceiptText: Receipt,
  UserCog,
  Shirt,
};

export function iconForKind(kind: RequestKind): LucideIcon {
  return ICONS[kindConfig(kind).icon] ?? FileText;
}

/** Rounded accent tile holding the kind's icon. */
export function KindIcon({
  kind,
  className,
}: {
  kind: RequestKind;
  className?: string;
}) {
  const config = kindConfig(kind);
  const Icon = iconForKind(kind);
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
        REQUEST_ACCENT[config.accent].pill,
        className
      )}
    >
      <Icon className="size-4.5" />
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge
      className={cn(
        "border-transparent",
        STATUS_TONE_CLASS[requestStatusTone(status)]
      )}
    >
      {REQUEST_STATUS_LABEL[status]}
    </Badge>
  );
}
