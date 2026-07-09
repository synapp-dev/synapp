"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";
import { SECTION_NAVS } from "@/lib/nav/section-nav";

const VITALS_NAV = SECTION_NAVS.find((nav) => nav.key === "vitals")!;

export function VitalsTabNav() {
  const pathname = usePathname();

  return (
    <div className="hidden overflow-x-auto pb-1 md:block [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <nav
        className="bg-muted text-muted-foreground inline-flex h-9 w-max min-w-full items-center justify-start rounded-lg p-[3px] sm:min-w-0"
        aria-label="Vitals categories"
      >
        {VITALS_NAV.items.map((tab) => {
          const isActive = (tab.match ?? ((p) => p === tab.href))(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-ring/50",
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
