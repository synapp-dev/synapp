"use client";

import * as React from "react";
import {
  AudioWaveform,
  Command,
  Mail,
  School,
  FileText,
  Users,
  TriangleAlert,
  MessageCircleQuestion,
  HandHelping,
  Presentation,
  BookOpenText,
  LibraryBig,
  GraduationCap,
  LayoutDashboard,
  House,
  ShieldCheck,
  HelpingHand,
  IdCard,
  FilePenLine,
  Settings,
  Hand,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";

import { NavMain } from "@/components/organisms/nav-main";
import { NavUser } from "@/components/molecules/nav-user";
import { TeamSwitcher } from "@/components/organisms/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import Image from "next/image";
import { Separator } from "@workspace/ui/components/separator";
import { useDemoUserSwitcherStore } from "@/stores/demo-user-switcher-store";
import Link from "next/link";

// This is sample data.
const data = {
  user: {
    name: "Aaron Girton",
    email: "agirton@intradark.com",
    avatar: "/avatars/aaron-girton.jpg",
  },
  teams: [
    {
      name: "Melbourne Grammar",
      logo: School,
      plan: "Teacher",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navBullyproof: [
    {
      title: "Admin",
      url: "/admin",
      icon: ShieldCheck,
      isActive: true,
      items: [
        {
          title: "Course Editor",
          url: "/admin/course-editor",
          icon: FilePenLine,
        },
        {
          title: "Schools",
          url: "/schools",
          icon: School,
          isActive: false,
        },
        {
          title: "Staff",
          url: "/admin/staff",
          icon: IdCard,
        },
        {
          title: "Settings",
          url: "/admin/settings",
          icon: Settings,
        },
      ],
    },
    {
      title: "AP Certification",
      url: "/welcome",
      icon: BadgeCheck,
      isActive: false,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: false,
    },
    {
      title: "Support",
      url: "/support",
      icon: HelpingHand,
      isActive: true,
    },
  ],
  navSchoolMain: [
    {
      title: "Home",
      url: "/teachers",
      icon: House,
      isActive: false,
    },
    {
      title: "Performance",
      url: "/performance",
      icon: TrendingUp,
      isActive: false,
    },
  ],
  navPeople: [
    {
      title: "Teachers",
      url: "/teachers",
      icon: Users,
      isActive: false,
    },
    {
      title: "Classes",
      url: "/classes",
      icon: GraduationCap,
      isActive: false,
    },
  ],
  navCurriculum: [
    {
      title: "Lessons",
      url: "/lessons",
      icon: Presentation,
      isActive: false,
    },
    {
      title: "Content",
      url: "/content",
      icon: BookOpenText,
      isActive: false,
    },
    {
      title: "Resources",
      url: "/resources",
      icon: LibraryBig,
      isActive: false,
    },
  ],
  navData: [
    // TODO: remove emails functionality
    // {
    //   title: "Emails",
    //   url: "#",
    //   icon: Mail,
    //   isActive: false,
    // },
    // TODO: remove incident functionality
    // {
    //   title: "Incidents",
    //   url: "#",
    //   icon: TriangleAlert,
    //   isActive: false,
    // },
    {
      title: "Reports",
      url: "#",
      icon: FileText,
      isActive: false,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const selectedRole = useDemoUserSwitcherStore((s) => s.selectedUser);

  const platformItems = React.useMemo(() => {
    const items = [...data.navBullyproof];
    const isAdminRole =
      selectedRole === "Bullyproof Admin" ||
      selectedRole === "Bullyproof Staff";
    return isAdminRole ? items : items.filter((i) => i.title !== "Admin");
  }, [selectedRole]);
  const selectedSchoolSlug = useDemoUserSwitcherStore(
    (s) => s.selectedSchoolSlug
  );

  const withSlug = React.useCallback(
    (items: Array<any>) =>
      items.map((i) => ({
        ...i,
        url: selectedSchoolSlug
          ? `/schools/${selectedSchoolSlug}${i.url}`
          : i.url,
        items: i.items
          ? i.items.map((sub: any) => ({
              ...sub,
              url: selectedSchoolSlug
                ? `/schools/${selectedSchoolSlug}${sub.url}`
                : sub.url,
            }))
          : undefined,
      })),
    [selectedSchoolSlug]
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Image
          src="/images/bullyproof-logo.svg"
          alt="Bullyproof Logo"
          width={500}
          height={500}
          className="h-16 mt-4"
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={platformItems} title="Platform" />

        <Separator className="my-3" />

        <TeamSwitcher />

        <div className="space-y-4 -mt-2">
          <NavMain items={withSlug(data.navSchoolMain)} />
          <NavMain items={withSlug(data.navPeople)} title="People" />
          <NavMain items={withSlug(data.navCurriculum)} title="Curriculum" />
          <NavMain items={withSlug(data.navData)} title="Data" />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
