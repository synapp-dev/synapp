"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronsRight,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { useUserProfile } from "@/stores/user-profile-store";

export function NavUser() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { user: profile, isLoading } = useUserProfile();

  const handleSignOut = () => {
    window.location.href = "/api/auth/signout";
  };

  // Same as dashboard: username from user_profiles first, then email below
  const username =
    profile?.username ?? profile?.display_name ?? profile?.name ?? "User";
  const email = profile?.email ?? "";
  const initials = (username || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <span className="truncate max-w-[160px]">Loading...</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!profile) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="group/nav-user"
            onClick={() => {
              window.location.href = "/api/auth/steam";
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Image
                src="/images/logos/steam-logo-white.svg"
                alt="Steam"
                width={20}
                height={20}
                className="h-5 w-5 flex-shrink-0"
              />
              <span className="truncate font-medium">Sign In</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group/nav-user"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={profile.avatar_url} alt={username} />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{username}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email || `${profile.id.slice(0, 8)}...`}
                </span>
              </div>
              <ChevronsRight className="mr-1 size-4 text-muted-foreground/50 group-hover/nav-user:text-muted-foreground group-hover/nav-user:-rotate-45 transition-all" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{username}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {email || `${profile.id.slice(0, 8)}...`}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard")}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
