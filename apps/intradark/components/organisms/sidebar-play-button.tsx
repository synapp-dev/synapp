"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";

import { PlayOptions } from "@/components/organisms/play-options";

/**
 * Sidebar Play button. A right-side popout lists the same play-mode options;
 * all options toast for now (demo only).
 */
export function SidebarPlayButton() {
  const [open, setOpen] = React.useState(false);
  const { state, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip="Play"
              className={cn(
                "gap-2 font-semibold",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 hover:text-primary-foreground",
                "active:bg-primary/90 active:text-primary-foreground",
                collapsed ? "justify-center" : "justify-start",
              )}
            >
              <Play className="size-4 fill-current" aria-hidden />
              {!collapsed && <span>Play</span>}
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" side="right" align="start">
            <div className="px-1 pb-2">
              <p className="text-sm font-semibold">Play</p>
              <p className="text-xs text-muted-foreground">
                Choose how you want to jump in.
              </p>
            </div>
            <PlayOptions
              onSelect={(option) => {
                setOpen(false);
                toast(`${option.title} — coming soon`);
              }}
            />
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
