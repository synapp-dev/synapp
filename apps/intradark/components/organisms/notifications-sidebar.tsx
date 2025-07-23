"use client";

import * as React from "react";
import {
  AudioWaveform,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  Heart,
  AtSign,
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import { RightSidebar } from "@workspace/ui/components/right-sidebar";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
} from "@workspace/ui/components/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Avatar, AvatarImage } from "@workspace/ui/components/avatar";
import { useRightSidebar } from "@workspace/ui/components/right-sidebar-provider";

// This is sample data.
const data = {
  user: {
    name: "Aaron Girton",
    email: "aaron@synapp.com.au",
    avatar: "",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "All",
      icon: Bell,
      isActive: true,
      count: 12,
    },
    {
      title: "Unread",
      icon: AlertCircle,
      isActive: false,
      count: 3,
    },
    {
      title: "Comments",
      icon: MessageSquare,
      isActive: false,
      count: 5,
    },
    {
      title: "Pending",
      icon: Clock,
      isActive: false,
      count: 2,
    },
    {
      title: "Completed",
      icon: CheckCircle2,
      isActive: false,
      count: 7,
    },
    {
      title: "Settings",
      icon: Settings2,
      isActive: false,
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
  notifications: [
    {
      id: 1,
      type: "comment",
      title: "John Doe commented on your post",
      message:
        "This is really interesting! I've been working on something similar. Would love to hear more about your approach.",
      time: "2 minutes ago",
      read: false,
      avatar: "/avatars/01.png",
    },
    {
      id: 2,
      type: "like",
      title: "Sarah Smith liked your photo",
      message:
        "Your latest project update looks amazing! The new design is really coming together.",
      time: "1 hour ago",
      read: false,
      avatar: "/avatars/02.png",
    },
    {
      id: 3,
      type: "mention",
      title: "You were mentioned in a post",
      message:
        "Check out this new feature @you implemented. It's exactly what we needed!",
      time: "3 hours ago",
      read: true,
      avatar: "/avatars/03.png",
    },
    {
      id: 4,
      type: "follow",
      title: "New follower",
      message: "Michael Brown started following you",
      time: "5 hours ago",
      read: true,
      avatar: "/avatars/04.png",
    },
    {
      id: 5,
      type: "system",
      title: "System update completed",
      message:
        "Your workspace has been updated to the latest version with new features and improvements.",
      time: "1 day ago",
      read: true,
      avatar: "/avatars/05.png",
    },
  ],
};

export function NotificationsSidebar() {
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const { open, setOpen } = useRightSidebar();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "comment":
        return MessageSquare;
      case "like":
        return Heart;
      case "mention":
        return AtSign;
      case "follow":
        return UserPlus;
      case "system":
        return AlertTriangle;
      default:
        return Bell;
    }
  };

  const getFilterLabel = (type: string) => {
    switch (type) {
      case "comment":
        return "Comments";
      case "like":
        return "Likes";
      case "mention":
        return "Mentions";
      case "follow":
        return "Follows";
      case "system":
        return "System";
      default:
        return "Notifications";
    }
  };

  const hasUnreadNotifications = (type: string) => {
    return data.notifications.some((n) => n.type === type && !n.read);
  };

  const notificationTypes = [
    { type: "comment", label: "Comments" },
    { type: "like", label: "Likes" },
    { type: "mention", label: "Mentions" },
    { type: "follow", label: "Follows" },
    { type: "system", label: "System" },
  ];

  const filteredNotifications = React.useMemo(() => {
    let filtered = data.notifications;
    if (filter !== "all") {
      filtered = filtered.filter((n) => n.type === filter);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(searchLower) ||
          n.message.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [filter, search]);

  return (
    <RightSidebar collapsible="icon">
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full flex-col gap-2">
          {open ? (
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {filter === "all" ? (
                      <Bell className="size-4" />
                    ) : (
                      React.createElement(getNotificationIcon(filter), {
                        className: "size-4",
                      })
                    )}
                    <span className="text-base font-medium">
                      {getFilterLabel(filter)}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4" />
                    <span>All Notifications</span>
                  </div>
                </SelectItem>
                <SelectItem value="comment">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4" />
                    <span>Comments</span>
                  </div>
                </SelectItem>
                <SelectItem value="like">
                  <div className="flex items-center gap-2">
                    <Heart className="size-4" />
                    <span>Likes</span>
                  </div>
                </SelectItem>
                <SelectItem value="mention">
                  <div className="flex items-center gap-2">
                    <AtSign className="size-4" />
                    <span>Mentions</span>
                  </div>
                </SelectItem>
                <SelectItem value="follow">
                  <div className="flex items-center gap-2">
                    <UserPlus className="size-4" />
                    <span>Follows</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4" />
                    <span>System</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2">
              <Bell className="size-4" />
            </div>
          )}
          {open && (
            <div className="relative">
              <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
              <SidebarInput
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        {open ? (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <Card key={notification.id} className="group/notification-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Avatar className="size-4 bg-muted">
                      <AvatarImage src={notification.avatar} />
                    </Avatar>
                    <h3 className="text-sm font-medium line-clamp-1">
                      {notification.title}
                    </h3>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted group-hover/notification-card:text-foreground transition-colors">
                    {notification.time}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {notificationTypes.map(({ type, label }) => {
              const Icon = getNotificationIcon(type);
              const hasUnread = hasUnreadNotifications(type);

              return (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <button
                      className="relative flex items-center justify-center p-2 hover:bg-muted rounded-md transition-colors"
                      onClick={() => {
                        setFilter(type);
                        setOpen(true);
                      }}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          !hasUnread && "text-muted-foreground"
                        )}
                      />
                      {hasUnread && (
                        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-yellow-500" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" align="center">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </SidebarContent>
      {/* <SidebarFooter>
        <div className="flex items-center justify-between p-4 text-xs text-muted-foreground">
          <span>{filteredNotifications.length} notifications</span>
          <button className="hover:text-foreground">Mark all as read</button>
        </div>
      </SidebarFooter> */}
    </RightSidebar>
  );
}
