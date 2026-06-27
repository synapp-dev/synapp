"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, Sparkles, Swords } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

const tabs = [
  { key: "home", label: "Home", href: "/scrims", icon: Swords },
  {
    key: "listings",
    label: "All Listings",
    href: "/scrims/listings",
    icon: ListChecks,
  },
] as const;

export function ScrimTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Scrim sections">
      {tabs.map((tab) => {
        const active =
          tab.href === "/scrims"
            ? pathname === "/scrims"
            : pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}

      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/40"
            aria-disabled
          >
            <Sparkles className="size-4" />
            Smart Scheduler
          </span>
        </TooltipTrigger>
        <TooltipContent>Coming soon</TooltipContent>
      </Tooltip>
    </nav>
  );
}
