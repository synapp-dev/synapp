"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

const GYM_TABS = [
  {
    title: "Progress",
    href: "/health/gym/progress",
    match: (p: string) => p.startsWith("/health/gym/progress"),
  },
  { title: "Today", href: "/health/gym", match: (p: string) => p === "/health/gym" },
  {
    title: "Schedule",
    href: "/health/gym/schedule",
    match: (p: string) => p.startsWith("/health/gym/schedule"),
  },
  {
    title: "Session",
    href: "/health/gym/session",
    match: (p: string) => p.startsWith("/health/gym/session"),
  },
  {
    title: "Programs",
    href: "/health/gym/programs",
    match: (p: string) => p.startsWith("/health/gym/programs"),
  },
  {
    title: "Exercises",
    href: "/health/gym/exercises",
    match: (p: string) => p.startsWith("/health/gym/exercises"),
  },
] as const;

export function GymTabNav() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <nav
        className="bg-muted text-muted-foreground inline-flex h-9 w-max min-w-full items-center justify-start rounded-lg p-[3px] sm:min-w-0"
        aria-label="Gym sections"
      >
        {GYM_TABS.map((tab) => {
          const isActive = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-ring/50",
                isActive
                  ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
                  : "text-foreground dark:text-muted-foreground",
              )}
            >
              {tab.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
