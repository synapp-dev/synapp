"use client";

import * as React from "react";
import {
  FileText,
  Users,
  Presentation,
  BookOpenText,
  LibraryBig,
  GraduationCap,
  LayoutDashboard,
  House,
  HelpingHand,
  Settings,
  TrendingUp,
} from "lucide-react";

import { NavMain } from "@/components/organisms/nav-main";
import { NavUser } from "@/components/molecules/nav-user";
import { SchoolSwitcher } from "@/components/organisms/school-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import Image from "next/image";
import { Separator } from "@workspace/ui/components/separator";
import { useSchoolStore } from "@/stores/school-store";
import { usePathname } from "next/navigation";

// This is sample data.
const data = {
  navBullyproof: [
    // {
    //   title: "Admin",
    //   url: "/admin",
    //   icon: ShieldCheck,
    //   isActive: false,
    //   items: [
    //     {
    //       title: "Course Editor",
    //       url: "/admin/course-editor",
    //       icon: FilePenLine,
    //     },
    //     {
    //       title: "CRM",
    //       url: "/admin/crm",
    //       exact: true,
    //       icon: UserSearch,
    //       isActive: false,
    //     },
    //     {
    //       title: "Staff",
    //       url: "/admin/staff",
    //       icon: IdCard,
    //     },
    //     {
    //       title: "Settings",
    //       url: "/admin/settings",
    //       icon: Settings,
    //     },
    //   ],
    // },
    // {
    //   title: "AP Certification",
    //   url: "/ap-certification",
    //   icon: BadgeCheck,
    //   isActive: false,
    // },
    // {
    //   title: "Welcome",
    //   url: "/welcome",
    //   icon: Apple,
    //   isActive: false,
    // },
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
      isActive: false,
    },
  ],
  navSchoolMain: [
    {
      title: "Home",
      url: "/home",
      icon: House,
      isActive: false,
    },
    {
      title: "Performance",
      url: "/performance",
      icon: TrendingUp,
      isActive: false,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
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
    {
      title: "Reports",
      url: "/reports",
      icon: FileText,
      isActive: false,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const pathname = usePathname();

  const platformItems = React.useMemo(() => {
    return [...data.navBullyproof];
  }, []);

  const schoolSlugFromPath = React.useMemo(() => {
    // Match /schools/{slug}/...
    const match = pathname.match(/^\/schools\/([^\/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Get the active school slug for URL generation
  // Only use store state on client side to avoid hydration mismatch
  const [activeSchoolSlug, setActiveSchoolSlug] = React.useState<string | null>(
    schoolSlugFromPath || null
  );

  React.useEffect(() => {
    // On client side, update with store state if not on a school page
    if (!schoolSlugFromPath) {
      const currentSchool = useSchoolStore.getState().currentSchool;
      const lastAccessedSchool = useSchoolStore.getState().lastAccessedSchool;
      const activeSchool = currentSchool || lastAccessedSchool;
      setActiveSchoolSlug(activeSchool?.slug || null);
    } else {
      setActiveSchoolSlug(schoolSlugFromPath);
    }
  }, [schoolSlugFromPath]);

  const withSlug = React.useCallback(
    (items: Array<any>) =>
      items.map((i) => ({
        ...i,
        url: activeSchoolSlug ? `/schools/${activeSchoolSlug}${i.url}` : i.url,
        items: i.items
          ? i.items.map((sub: any) => ({
              ...sub,
              url: activeSchoolSlug
                ? `/schools/${activeSchoolSlug}${sub.url}`
                : sub.url,
            }))
          : undefined,
      })),
    [activeSchoolSlug]
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="mb-2">
        {state === "expanded" ? (
          <Image
            src="/images/bullyproof-logo.svg"
            alt="Bullyproof Logo"
            width={500}
            height={500}
            className="h-16 mt-4"
          />
        ) : (
          <Image
            src="/images/bp-small-logo.svg"
            alt="Bullyproof Small Logo"
            width={500}
            height={500}
            className="h-10 mt-4"
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={platformItems} title="Platform" />

        <Separator className="my-2" />

        <div className="-space-y-2">
          <SchoolSwitcher />

          <div className="space-y-4">
            <NavMain items={withSlug(data.navSchoolMain)} />
            <NavMain items={withSlug(data.navPeople)} title="People" />
            <NavMain items={withSlug(data.navCurriculum)} title="Curriculum" />
            <NavMain items={withSlug(data.navData)} title="Data" />
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
