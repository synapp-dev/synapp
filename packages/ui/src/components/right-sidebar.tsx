"use client";

import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { useRightSidebar } from "./right-sidebar-provider";

const SIDEBAR_WIDTH_MOBILE = "18rem";

export function RightSidebar({
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useRightSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="right-sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-(--right-sidebar-width) flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="right-sidebar"
          data-slot="right-sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-(--right-sidebar-width) p-0 [&>button]:hidden"
          style={
            {
              "--right-sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side="right"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Right Sidebar</SheetTitle>
            <SheetDescription>
              Displays the right mobile sidebar.
            </SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side="right"
      data-slot="right-sidebar"
    >
      <div
        data-slot="right-sidebar-gap"
        className={cn(
          "relative w-(--right-sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--right-sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--right-sidebar-width-icon)"
        )}
      />
      <div
        data-slot="right-sidebar-container"
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-(--right-sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
          "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--right-sidebar-width)*-1)]",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--right-sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--right-sidebar-width-icon) group-data-[side=right]:border-l",
          className
        )}
        {...props}
      >
        <div
          data-sidebar="right-sidebar"
          data-slot="right-sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
