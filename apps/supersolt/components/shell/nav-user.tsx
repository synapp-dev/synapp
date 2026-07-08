"use client";

import Link from "next/link";
import { ChevronsRight, Cpu, LogOut, Settings } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { useMeStore } from "@/entities/me/model/store";
import { ReplaySetupIntroMenuItem } from "@/components/shell/replay-setup-intro-menu-item";
import { RestartInventorySetupMenuItem } from "@/components/shell/restart-inventory-setup-menu-item";
import { ResetNormalisationMenuItem } from "@/components/shell/reset-normalisation-menu-item";
import { ResetProductsMenuItem } from "@/components/shell/reset-products-menu-item";

export function NavUser() {
  const { isMobile } = useSidebar();
  const currentUser = useMeStore((state) => state.currentUser);

  const profileName = [currentUser?.firstName, currentUser?.lastName]
    .filter((part) => Boolean(part))
    .join(" ")
    .trim();
  const name = profileName || currentUser?.fullName || currentUser?.email || "User";
  const email = currentUser?.email || "";
  const avatar = currentUser?.avatarUrl || undefined;
  const initials = (name || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="group/nav-user data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {email}
                </span>
              </div>
              <ChevronsRight className="mr-1 size-4 text-muted-foreground/50 transition-all group-hover/nav-user:-rotate-45 group-hover/nav-user:text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/about">
                  <Cpu />
                  About
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <ReplaySetupIntroMenuItem />
            <ResetNormalisationMenuItem />
            <ResetProductsMenuItem />
            <RestartInventorySetupMenuItem />
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/logout">
                <LogOut />
                Log out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
