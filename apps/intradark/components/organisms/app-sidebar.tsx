"use client";

import * as React from "react";
import Link from "next/link";
import {
  Binoculars,
  Home,
  LayoutDashboard,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  User,
  UserSearch,
} from "lucide-react";

import { NavUser } from "@/components/molecules/nav-user";
import { NavItem } from "@/components/molecules/nav-item";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
} from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";
import Image from "next/image";

// Navigation data object
const navigationItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    children: "Dashboard",
  },
  {
    href: "/news",
    icon: Newspaper,
    children: "News",
  },
  {
    href: "/veritas",
    icon: ShieldCheck,
    children: "Veritas",
    items: [
      {
        href: "/veritas/check",
        icon: UserSearch,
        children: "Check Player",
      },
      {
        href: "/veritas/watchlist",
        icon: Binoculars,
        children: "Watchlist",
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-1 my-4 w-full justify-center">
          <Image
            src="/images/logos/intradark-symbol-blue.svg"
            alt="Intradark Logo"
            width={20}
            height={20}
            className="h-3 w-3 animate-spin-slow mb-2"
          />
          <Image
            src="/images/logos/intradark-wordmark-white.svg"
            alt="Intradark Logo"
            width={100}
            height={20}
            className="h-4"
          />
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent className="overflow-y-auto mx-6">
        <SidebarMenu>
          {navigationItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              items={item.items}
            >
              {item.children}
            </NavItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
