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
  ShieldCheck,
  TvMinimalPlay,
  Wrench,
  Apple,
  BadgeCheck,
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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useSchoolStore } from "@/stores/school-store";
import { usePathname } from "next/navigation";
import { useIsPlatformAdmin, useMeStore } from "@/entities/me/model/store";
import { useLiveLessonStore } from "@/stores/live-lesson-store";
import { useSchoolNavigationPermissions } from "@/hooks/use-school-navigation-permissions";

// This is sample data.
const data = {
  navBullyproof: [
    {
      title: "Admin",
      url: "/admin",
      icon: ShieldCheck,
      isActive: false,
    },
    {
      title: "AP Certification",
      url: "/ap-certification",
      icon: BadgeCheck,
      isActive: false,
    },
    {
      title: "Welcome",
      url: "/welcome",
      icon: Apple,
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
    {
      title: "Setup",
      url: "/setup",
      icon: Wrench,
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
  const isPlatformAdmin = useIsPlatformAdmin();
  const currentUser = useMeStore((s) => s.currentUser);

  // Check if welcome tutorial is completed
  const isWelcomeCompleted = React.useMemo(() => {
    if (!currentUser?.metadata) return false;
    const metadata = currentUser.metadata as any;
    return metadata?.tutorials?.welcome?.completed === true;
  }, [currentUser]);

  const platformItems = React.useMemo(() => {
    // If welcome is not completed, only show Welcome
    if (!isWelcomeCompleted) {
      return data.navBullyproof.filter((item) => item.title === "Welcome");
    }

    // If welcome is completed, show all items except Welcome
    // Filter out Admin menu if user is not a platform admin
    return data.navBullyproof.filter((item) => {
      if (item.title === "Welcome") {
        return false; // Hide Welcome after completion
      }
      if (item.title === "Admin" && !isPlatformAdmin) {
        return false;
      }
      return true;
    });
  }, [isPlatformAdmin, isWelcomeCompleted]);

  const schoolSlugFromPath = React.useMemo(() => {
    // Match /schools/{slug}/...
    const match = pathname.match(/^\/schools\/([^\/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Subscribe to school store to get reactive updates
  const activeSchool = useSchoolStore((s) => s.getActiveSchool());
  const currentSchool = useSchoolStore((s) => s.currentSchool);

  // Determine if a school is selected - check both store and pathname
  const hasSchoolSelected = React.useMemo(() => {
    // If we're on a school page, consider it selected
    if (schoolSlugFromPath) return true;
    // Only show school links if currentSchool is explicitly set
    // Don't fall back to lastAccessedSchool when user has deselected
    return !!currentSchool;
  }, [schoolSlugFromPath, currentSchool]);

  // Get the active school slug for URL generation
  // Only use store state on client side to avoid hydration mismatch
  const [activeSchoolSlug, setActiveSchoolSlug] = React.useState<string | null>(
    schoolSlugFromPath || null
  );

  React.useEffect(() => {
    // On client side, update with store state if not on a school page
    if (!schoolSlugFromPath) {
      const activeSchoolFromStore = activeSchool;
      setActiveSchoolSlug(activeSchoolFromStore?.slug || null);
    } else {
      setActiveSchoolSlug(schoolSlugFromPath);
    }
  }, [schoolSlugFromPath, activeSchool]);

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

  // Use shared navigation permissions hook
  const { filterItems } = useSchoolNavigationPermissions();

  // Filter school navigation items based on teacher role
  const filteredNavSchoolMain = React.useMemo(
    () => filterItems(data.navSchoolMain),
    [filterItems]
  );

  const filteredNavData = React.useMemo(
    () => filterItems(data.navData),
    [filterItems]
  );

  const isLive = useLiveLessonStore((s) => s.isLive);
  const liveUrl = useLiveLessonStore((s) => s.getUrl());

  const platformItemsWithLive = React.useMemo(() => {
    // Don't show live lesson if welcome is not completed
    if (!isWelcomeCompleted) {
      return platformItems;
    }

    if (!isLive || !liveUrl) return platformItems;
    const items = [...platformItems];
    const dashboardIndex = items.findIndex((i) => i.title === "Dashboard");
    const liveItem = {
      title: "Live Lesson",
      url: liveUrl,
      icon: TvMinimalPlay,
      isActive: false,
      disableActiveStyle: true,
      liveStyle: true,
    };
    if (dashboardIndex !== -1) {
      items.splice(dashboardIndex + 1, 0, liveItem);
    } else {
      items.unshift(liveItem);
    }
    return items;
  }, [platformItems, isLive, liveUrl, isWelcomeCompleted]);

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
        <ScrollArea className="h-full">
          <NavMain items={platformItemsWithLive} title="Platform" />
          {/* Only show separator, school switcher, and school navigation if welcome is completed */}
          {isWelcomeCompleted && (
            <>
              <Separator className="my-2" />
              <div className="-space-y-2">
                <SchoolSwitcher />

                {/* Only show school-specific navigation when a school is selected */}
                {hasSchoolSelected && (
                  <div className="space-y-4" key={activeSchoolSlug}>
                    {/* navSchoolMain: filtered based on role - starts at 0 */}
                    {filteredNavSchoolMain.length > 0 && (
                      <NavMain
                        items={withSlug(filteredNavSchoolMain)}
                        enableStaggeredAnimation
                        startIndex={0}
                      />
                    )}
                    {/* navPeople: 2 items, has title - title at 3, items at 4-5 */}
                    <NavMain
                      items={withSlug(data.navPeople)}
                      title="People"
                      enableStaggeredAnimation
                      startIndex={3}
                    />
                    {/* navCurriculum: 3 items, has title - title at 6, items at 7-9 */}
                    <NavMain
                      items={withSlug(data.navCurriculum)}
                      title="Curriculum"
                      enableStaggeredAnimation
                      startIndex={6}
                    />
                    {/* navData: filtered based on role - title at 10, item at 11 */}
                    {filteredNavData.length > 0 && (
                      <NavMain
                        items={withSlug(filteredNavData)}
                        title="Data"
                        enableStaggeredAnimation
                        startIndex={10}
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
