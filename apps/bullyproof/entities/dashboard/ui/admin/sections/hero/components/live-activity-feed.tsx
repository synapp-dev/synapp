"use client";

import { useEffect, useState } from "react";
import {
  School,
  GraduationCap,
  Award,
  UserPlus,
  FileBadge2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  adminActivityApi,
  type AdminActivityFeedItemDto,
} from "@/entities/dashboard/api/admin-activity";

const ROTATION_MS = 4000;

const getIcon = (type: string) => {
  switch (type) {
    case "school_onboarded":
      return <School className="h-4 w-4" />;
    case "class_completed":
      return <GraduationCap className="h-4 w-4" />;
    case "training_completed":
      return <Award className="h-4 w-4" />;
    case "user_registered":
      return <UserPlus className="h-4 w-4" />;
    case "certificate_issued":
      return <FileBadge2 className="h-4 w-4" />;
    default:
      return <School className="h-4 w-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "school_onboarded":
      return "bg-blue-100 text-blue-800";
    case "class_completed":
      return "bg-green-100 text-green-800";
    case "training_completed":
      return "bg-purple-100 text-purple-800";
    case "user_registered":
      return "bg-cyan-100 text-cyan-800";
    case "certificate_issued":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "school_onboarded":
      return "SCHOOL";
    case "class_completed":
      return "CLASS";
    case "training_completed":
      return "TRAINING";
    case "user_registered":
      return "USER";
    case "certificate_issued":
      return "CERTIFICATE";
    default:
      return "EVENT";
  }
};

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffInSeconds = Math.floor(
    (now.getTime() - eventTime.getTime()) / 1000
  );

  if (diffInSeconds < 0 || diffInSeconds < 60) {
    return "Just now";
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffInSeconds / 86400);
  return `${days}d ago`;
};

export function LiveActivityFeed() {
  const [index, setIndex] = useState(0);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "dashboard-activity"],
    queryFn: async (): Promise<AdminActivityFeedItemDto[]> => {
      const result = await adminActivityApi.list();
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to load activity");
      }
      return result.data ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const events = data ?? [];
  const len = events.length;

  useEffect(() => {
    setIndex(0);
  }, [len]);

  useEffect(() => {
    if (len <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % len);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [len]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
        Loading activity…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-4 w-full">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {error instanceof Error ? error.message : "Could not load activity"}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (len === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-muted-foreground text-sm px-4">
        No recent activity
      </div>
    );
  }

  const current = events[index]!;

  return (
    <div
      className="flex items-center justify-between h-full w-full px-4 py-4"
      key={current.id}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="animate-slide-left-fade-in-slow flex item-center shrink-0"
          key={current.id}
        >
          <Badge
            variant="secondary"
            className={cn("text-xs", getTypeColor(current.type))}
          >
            {getIcon(current.type)}
            {getTypeLabel(current.type)}
          </Badge>
        </div>

        <span className="text-sm text-foreground animate-slide-up-fade-in-slow truncate">
          {current.message}
        </span>
      </div>

      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2 tabular-nums">
        {formatTimeAgo(current.occurredAt)}
      </span>
    </div>
  );
}
