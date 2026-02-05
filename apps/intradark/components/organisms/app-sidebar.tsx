"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Play,
  LayoutDashboard,
  Trophy,
  MapPin,
  Users,
  Swords,
  CalendarDays,
  Newspaper,
  MessageSquare,
  Film,
  BookOpen,
  Wrench,
  BarChart3,
  List,
} from "lucide-react";

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

const navPlatform = [
  { title: "Play", url: "#", icon: Play, disabled: true },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    items: [
      { title: "Matches", url: "/matches", icon: Trophy },
      { title: "Positions", url: "/positions", icon: MapPin },
      { title: "Crew", url: "/crew", icon: Users },
    ],
  },
];

const navCompetitive = [
  { title: "Teams", url: "/teams", icon: Users },
  { title: "Scrims", url: "/scrims", icon: Swords },
  { title: "Tournaments", url: "/tournaments", icon: CalendarDays },
];

const navCommunity = [
  { title: "News", url: "/news", icon: Newspaper },
  { title: "Forums", url: "/forums", icon: MessageSquare },
  { title: "Media", url: "/media", icon: Film },
];

const navKnowledge = [
  { title: "Theory", url: "/theory", icon: BookOpen },
  { title: "Utility", url: "/utility", icon: Wrench },
];

const navInsight = [
  { title: "Stats", url: "/stats", icon: BarChart3 },
  { title: "Watchlist", url: "/watchlist", icon: List },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile } = useSidebar();
  const displayState = isMobile ? "expanded" : state;

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
