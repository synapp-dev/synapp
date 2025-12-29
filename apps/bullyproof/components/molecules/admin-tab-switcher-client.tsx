"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { getAdminItemsByCategory } from "@/lib/admin-items";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";

interface AdminTabSwitcherClientProps {
  className?: string;
}

export function AdminTabSwitcherClient({
  className,
}: AdminTabSwitcherClientProps) {
  const pathname = usePathname();
  const tabCategories = getAdminItemsByCategory();

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
            const isDisabled = item.disabled === true;

            const className = cn(
              "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isDisabled
                ? "opacity-50 cursor-not-allowed text-muted-foreground"
                : [
                    "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground",
                  ]
            );

            const content = (
              <>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.title}</span>
              </>
            );

            if (isDisabled) {
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    <span className={className}>{content}</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    Currently under development
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={item.title} href={item.url} className={className}>
                {content}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
