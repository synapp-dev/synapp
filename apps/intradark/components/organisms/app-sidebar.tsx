"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Newspaper, Shield, SquareStack } from "lucide-react";

import { NavMain } from "@/components/organisms/nav-main";
import { NavUser } from "@/components/molecules/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

import { useUserProfile } from "@/stores/user-profile-store";
import {
  ROLE_DEVELOPER,
  ROLE_NEWS_EDITOR,
  ROLE_SANDBOX_ACCESS,
} from "@/entities/admin/lib/rbac-constants";
import { hasCapability } from "@/entities/admin/lib/role-slugs";
import {
  getNavPlatformBase,
  navCommunity,
  navCompetitive,
  navInsight,
  navKnowledge,
  type NavMainSidebarItem,
} from "@/lib/main-nav-routes";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile } = useSidebar();
  const displayState = isMobile ? "expanded" : state;
  const { user } = useUserProfile();

  const navPlatform = React.useMemo(() => {
    const slugs = user?.role_slugs ?? [];
    const showAdmin =
      slugs.includes(ROLE_DEVELOPER) ||
      slugs.some((s) =>
        [ROLE_SANDBOX_ACCESS, ROLE_NEWS_EDITOR].includes(
          s as typeof ROLE_SANDBOX_ACCESS | typeof ROLE_NEWS_EDITOR,
        ),
      );
    const showSandbox = slugs.includes(ROLE_SANDBOX_ACCESS);
    const showNewsAdmin = hasCapability(slugs, ROLE_NEWS_EDITOR);
    const prefix: NavMainSidebarItem[] = [];
    if (showAdmin) {
      const adminItems: NonNullable<NavMainSidebarItem["items"]> = [];
      if (showSandbox) {
        adminItems.push({
          title: "Sandbox",
          url: "/admin/sandbox",
          icon: SquareStack,
        });
      }
      if (showNewsAdmin) {
        adminItems.push({
          title: "News",
          url: "/news/admin",
          icon: Newspaper,
        });
      }
      prefix.push({
        title: "Admin",
        url: "/admin",
        icon: Shield,
        ...(adminItems.length > 0 ? { items: adminItems } : {}),
      });
    }
    return [...prefix, ...getNavPlatformBase()];
  }, [user?.role_slugs]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="mb-2">
        <Link href="/" className="block">
          {displayState === "expanded" ? (
            <div className="flex items-center gap-1 my-4 w-full justify-center">
              <Image
                src="/images/logos/intradark-symbol-blue.svg"
                alt="Intradark Logo"
                width={20}
                height={20}
                className="h-3 w-3 mb-2"
              />
              <Image
                src="/images/logos/intradark-wordmark-white.svg"
                alt="Intradark Logo"
                width={100}
                height={20}
                className="h-4"
              />
            </div>
          ) : (
            <div className="flex justify-center my-4">
              <Image
                src="/images/logos/intradark-symbol-blue.svg"
                alt="Intradark"
                width={24}
                height={24}
                className="h-6 w-6"
              />
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <NavMain items={navPlatform} title="Platform" />
          <NavMain items={navCommunity} title="Community" />
          <NavMain items={navCompetitive} title="Competitive" />
          <NavMain items={navKnowledge} title="Knowledge" />
          <NavMain items={navInsight} title="Insight" />
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
