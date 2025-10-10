"use client";

import { useState, useEffect } from "react";
import {
  School,
  Award,
  MessageSquare,
  TrendingUp,
  Rocket,
  UserPlus,
  Download,
  Clock,
  FileBadge2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface ActivityFeedProps {
  activityFeed: Array<{
    id: string;
    timestamp: string;
    type: string;
    message: string;
    icon: string;
  }>;
}

export function ActivityFeed({ activityFeed: initialFeed }: ActivityFeedProps) {
  const [feed, setFeed] = useState(initialFeed);
  const [isLive, setIsLive] = useState(true);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "School":
        return <School className="h-4 w-4" />;
      case "Award":
        return <Award className="h-4 w-4" />;
      case "MessageSquare":
        return <MessageSquare className="h-4 w-4" />;
      case "TrendingUp":
        return <TrendingUp className="h-4 w-4" />;
      case "Rocket":
        return <Rocket className="h-4 w-4" />;
      case "UserPlus":
        return <UserPlus className="h-4 w-4" />;
      case "Certificate":
        return <FileBadge2 className="h-4 w-4" />;
      case "Download":
        return <Download className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "school_onboarded":
        return "bg-blue-100 text-blue-800";
      case "training_completed":
        return "bg-green-100 text-green-800";
      case "lesson_feedback":
        return "bg-purple-100 text-purple-800";
      case "culture_update":
        return "bg-orange-100 text-orange-800";
      case "system_deploy":
        return "bg-gray-100 text-gray-800";
      case "user_registration":
        return "bg-cyan-100 text-cyan-800";
      case "certificate_issued":
        return "bg-yellow-100 text-yellow-800";
      case "data_export":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffInSeconds = Math.floor(
      (now.getTime() - eventTime.getTime()) / 1000
    );

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  };

  // Simulate live updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newEvent = {
        id: `live-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "system_activity",
        message: "System health check completed successfully",
        icon: "Clock",
      };

      setFeed((prev) => [newEvent, ...prev.slice(0, 9)]); // Keep only 10 most recent
    }, 8000); // Add new event every 8 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>Activity Feed</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isLive ? "default" : "secondary"}
              className={isLive ? "bg-green-100 text-green-800" : ""}
            >
              {isLive ? "Live" : "Paused"}
            </Badge>
            <button
              onClick={() => setIsLive(!isLive)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {isLive ? "Pause" : "Resume"}
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {feed.map((event, index) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  index === 0 && event.id.startsWith("live-")
                    ? "bg-green-50 border-green-200"
                    : "bg-background border-border"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(event.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getTypeColor(event.type)}`}
                    >
                      {event.type.replace("_", " ").toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{event.message}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
