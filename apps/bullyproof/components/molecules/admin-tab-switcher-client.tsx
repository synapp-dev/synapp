"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import {
  Building2,
  Users,
  GraduationCap,
  Presentation,
  BarChart3,
  Settings,
  FileText,
  HelpCircle,
  Home,
  BookOpenText,
} from "lucide-react";

const tabCategories = [
  {
    name: "Content",
    items: [
      {
        title: "Content",
        url: "/admin/content",
        icon: BookOpenText,
      },
    ],
  },
  {
    name: "Clients",
    items: [
      {
        title: "Schools",
        url: "/admin/schools",
        icon: Building2,
      },
      {
        title: "Users",
        url: "/admin/users",
        icon: Users,
      },
      {
        title: "Classes",
        url: "/admin/classes",
        icon: GraduationCap,
      },
    ],
  },
  {
    name: "Lessons",
    items: [
      {
        title: "Lessons",
        url: "/admin/lessons",
        icon: Presentation,
      },
    ],
  },
  {
    name: "Reporting",
    items: [
      {
        title: "Culture Ratings",
        url: "/admin/culture-ratings",
        icon: BarChart3,
      },
    ],
  },
  {
    name: "System Settings",
    items: [
      {
        title: "Audit Logs",
        url: "/admin/audit-logs",
        icon: FileText,
      },
    ],
  },
  {
    name: "Support Tools",
    items: [
      {
        title: "Support Tools",
        url: "/admin/support-tools",
        icon: HelpCircle,
      },
    ],
  },
];

interface AdminTabSwitcherClientProps {
  className?: string;
}

export function AdminTabSwitcherClient({
  className,
}: AdminTabSwitcherClientProps) {
  const pathname = usePathname();

  const isActive = React.useCallback(
    (url: string) => {
      return pathname === url || pathname.startsWith(url + "/");
    },
    [pathname]
  );

  return (
    <div className={cn("flex items-center gap-12", className)}>
      {tabCategories.map((category) => (
        <div key={category.name} className="flex items-center gap-0">
          {category.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.url);

            return (
              <Link
                key={item.title}
                href={item.url}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.title}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

