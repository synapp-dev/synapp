"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  teamAdminPath,
  teamHomePath,
  teamUpcomingPath,
} from "@/entities/teams/lib/resolve-team-slug";
import { cn } from "@workspace/ui/lib/utils";

const tabs = [
  { key: "home", label: "Home", path: teamHomePath },
  { key: "upcoming", label: "Upcoming", path: teamUpcomingPath },
  { key: "admin", label: "Admin", path: teamAdminPath },
] as const;

export function TeamTabs({
  slug,
  showAdmin,
}: {
  slug: string;
  showAdmin: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-1 border-b pb-2"
      aria-label="Team sections"
    >
      {tabs.map((tab) => {
        if (tab.key === "admin" && !showAdmin) return null;
        const href = tab.path(slug);
        const active = pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
