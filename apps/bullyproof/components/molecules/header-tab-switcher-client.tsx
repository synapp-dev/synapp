"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import {
  Home,
  TrendingUp,
  Users,
  GraduationCap,
  Presentation,
  BookOpenText,
  LibraryBig,
  FileText,
  Settings,
} from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";

interface TabItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface HeaderTabSwitcherClientProps {
  schoolSlug: string;
  className?: string;
}

const tabCategories = [
  {
    name: "Analytics",
    items: [
      {
        title: "Home",
        url: "/home",
        icon: Home,
      },
      {
        title: "Performance",
        url: "/performance",
        icon: TrendingUp,
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      },
    ],
  },
  {
    name: "People",
    items: [
      {
        title: "Teachers",
        url: "/teachers",
        icon: Users,
      },
      {
        title: "Classes",
        url: "/classes",
        icon: GraduationCap,
      },
    ],
  },
  {
    name: "Curriculum",
    items: [
      {
        title: "Lessons",
        url: "/lessons",
        icon: Presentation,
      },
      {
        title: "Content",
        url: "/content",
        icon: BookOpenText,
      },
      {
        title: "Resources",
        url: "/resources",
        icon: LibraryBig,
      },
    ],
  },
  {
    name: "Data",
    items: [
      {
        title: "Reports",
        url: "/reports",
        icon: FileText,
      },
    ],
  },
];

export function HeaderTabSwitcherClient({
  schoolSlug,
  className,
}: HeaderTabSwitcherClientProps) {
  const pathname = usePathname();

  const isActive = React.useCallback(
    (url: string) => {
      const fullUrl = `/schools/${schoolSlug}${url}`;
      return pathname === fullUrl || pathname.startsWith(fullUrl + "/");
    },
    [pathname, schoolSlug]
  );

  return (
    <div className={cn("flex items-center gap-12", className)}>
      {tabCategories.map((category) => (
        <div key={category.name} className="flex items-center gap-0">
          {category.items.map((item) => {
            const Icon = item.icon;
            const fullUrl = `/schools/${schoolSlug}${item.url}`;
            const active = isActive(item.url);

            return (
              <Link
                key={item.title}
                href={fullUrl}
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
