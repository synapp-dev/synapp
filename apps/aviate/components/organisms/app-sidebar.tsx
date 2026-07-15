"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CalendarOff,
  CalendarRange,
  ClipboardList,
  LayoutGrid,
  MessagesSquare,
  Plane,
  Settings,
  SunMedium,
  User,
  Users,
  UsersRound,
} from "lucide-react";

import { NavUser } from "@/components/molecules/nav-user";
import { NavMain, type NavMainItem } from "@/components/organisms/nav-main";
import { OrgSwitcher } from "@/components/organisms/org-switcher";
import { useMeStore } from "@/entities/me/model/store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";

const overviewItems: NavMainItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid, exact: true },
];

const moduleItems: NavMainItem[] = [
  {
    title: "Rostering",
    url: "/rostering",
    icon: CalendarClock,
    items: [
      { title: "Duty Roster", url: "/rostering", exact: true, icon: CalendarRange },
      { title: "Planner", url: "/rostering/planner", icon: CalendarClock },
      { title: "Shift Templates", url: "/rostering/templates", icon: BadgeCheck },
    ],
  },
  { title: "Requests & Forms", url: "/requests", icon: ClipboardList },
  { title: "Payslips", url: "/payslips", icon: Banknote },
  { title: "Leave", url: "/leave", icon: SunMedium },
  { title: "Availability", url: "/availability", icon: CalendarOff },
  { title: "Comms", url: "/comms", icon: MessagesSquare },
  {
    title: "People",
    url: "/people",
    icon: Users,
    items: [
      { title: "Directory", url: "/people", exact: true, icon: Users },
      { title: "Certifications", url: "/people/certifications", icon: Award },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const currentUser = useMeStore((state) => state.currentUser);
  const features = currentUser?.features ?? [];
  const canViewProfile =
    currentUser?.role === "admin" || features.includes("profile");
  const canAdmin =
    currentUser?.role === "admin" || currentUser?.role === "manager";

  const adminItems: NavMainItem[] = [
    { title: "Employees", url: "/admin/people", icon: UsersRound },
  ];

  const accountItems: NavMainItem[] = [
    { title: "Settings", url: "/settings", icon: Settings },
    ...(canViewProfile
      ? [{ title: "Profile", url: "/profile", icon: User }]
      : []),
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2">
          <Plane className="h-5 w-5 shrink-0" />
          <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Aviate
          </h2>
        </Link>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <NavMain items={overviewItems} />
        <Separator className="my-1" />
        <OrgSwitcher />
        <NavMain title="Modules" items={moduleItems} />
        {canAdmin ? <NavMain title="Admin" items={adminItems} /> : null}
        <NavMain title="Account" items={accountItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
