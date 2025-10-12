"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import {
  HelpCircle,
  BookOpen,
  Users,
  FileText,
  Download,
  Bug,
  Lightbulb,
  MessageCircle,
  AlertTriangle,
  Activity,
  GitCommit,
  Map,
  Shield,
  Mail,
} from "lucide-react";

interface TabItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SupportTabSwitcherClientProps {
  className?: string;
}

const tabCategories = [
  {
    name: "Help Resources",
    items: [
      {
        title: "FAQ",
        url: "/support/faq",
        icon: HelpCircle,
      },
      {
        title: "Tutorials",
        url: "/support/tutorials",
        icon: BookOpen,
      },
      {
        title: "Roles",
        url: "/support/roles",
        icon: Users,
      },
      {
        title: "Glossary",
        url: "/support/glossary",
        icon: FileText,
      },
      {
        title: "Resources",
        url: "/support/resources",
        icon: Download,
      },
    ],
  },
  {
    name: "System Info",
    items: [
      {
        title: "Status",
        url: "/support/status",
        icon: Activity,
      },
      {
        title: "Changelog",
        url: "/support/changelog",
        icon: GitCommit,
      },
    ],
  },
  {
    name: "Contact",
    items: [
      {
        title: "Contact Support",
        url: "/support/contact",
        icon: Mail,
      },
    ],
  },
];

export function SupportTabSwitcherClient({
  className,
}: SupportTabSwitcherClientProps) {
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
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
