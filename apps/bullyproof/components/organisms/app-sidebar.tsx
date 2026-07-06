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
import { SelectSchoolForLiveLessonsDialog } from "@/components/molecules/select-school-for-live-lessons-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import Image from "next/image";
import Link from "next/link";
import { Separator } from "@workspace/ui/components/separator";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useSchoolStore } from "@/stores/school-store";
import { usePathname, useRouter } from "next/navigation";
import { useMeStore } from "@/entities/me/model/store";
import { useFeaturesAccess } from "@/hooks/use-features-access";
import { MAINTENANCE_FEATURE_KEY } from "@/lib/feature-keys";
import { useLiveLessonStore } from "@/stores/live-lesson-store";
import { useUserLessonsStatusRealtime } from "@/hooks/use-lesson-status-realtime";
import { openSupportEmail } from "@/lib/support";

// This is sample data.
const data = {
  navBullyproof: [
    {
      title: "Admin",
      url: "/admin",
      icon: ShieldCheck,
      isActive: false,
      feature: "/admin", // Feature key for access control
    },
    {
      title: "AP Certification",
      url: "/courses",
      icon: BadgeCheck,
      isActive: false,
      feature: "/ap-certification", // Dedicated AP certification feature key
    },
    {
      title: "Welcome",
      url: "/welcome",
      icon: Apple,
      isActive: false,
      feature: "/welcome", // Feature key for access control
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: false,
      feature: "/dashboard", // Feature key for access control
    },
    {
      title: "Support",
      url: "/support",
      icon: HelpingHand,
      isActive: false,
      feature: "/support", // Feature key for access control
    },
  ],
  navSchoolMain: [
    {
      title: "Home",
      url: "/home",
      icon: House,
      isActive: false,
      feature: "/school/home", // Feature key for access control
    },
    {
      title: "Teachers",
      url: "/teachers",
      icon: Users,
      isActive: false,
      feature: "/school/teachers", // Feature key for access control
    },
    {
      title: "Classes",
      url: "/classes",
      icon: GraduationCap,
      isActive: false,
      feature: "/school/classes", // Feature key for access control
    },
  ],
  navCurriculum: [
    {
      title: "Teach Lessons",
      url: "/lessons",
      icon: Presentation,
      isActive: false,
      feature: "/school/lessons", // Feature key for access control
    },
    {
      title: "Preview Lessons",
      url: "/content",
      icon: BookOpenText,
      isActive: false,
      feature: "/school/content", // Feature key for access control
    },
    {
      title: "Resources",
      url: "/resources",
      icon: LibraryBig,
      isActive: false,
      feature: "/school/resources", // Feature key for access control
    },
  ],
  navData: [
    {
      title: "Performance",
      url: "/performance",
      icon: TrendingUp,
      isActive: false,
      feature: "/school/performance", // Feature key for access control
    },
    {
      title: "Reports",
      url: "/reports",
      icon: FileText,
      isActive: false,
      feature: "/school/reports", // Feature key for access control
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: false,
      feature: "/settings", // Feature key for access control
    },
  ],
};

const maintenanceNavItems = [
  {
    title: "Maintenance",
    url: "/maintenance",
    icon: Wrench,
    isActive: false,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile } = useSidebar();
  // On mobile, always render as expanded
  const displayState = isMobile ? "expanded" : state;
  const pathname = usePathname();
  const router = useRouter();
  const effectiveUser = useMeStore((s) => s.viewAsUser ?? s.currentUser);
  const maintenanceFeaturesAccess = useFeaturesAccess([MAINTENANCE_FEATURE_KEY]);
  const hasMaintenanceAccess = maintenanceFeaturesAccess[MAINTENANCE_FEATURE_KEY]?.hasAccess ?? false;
  const effectiveMaintenanceMode = hasMaintenanceAccess && !effectiveUser?.maintenanceBypass;
  // Listen for real-time status changes to user's lessons
  useUserLessonsStatusRealtime(effectiveUser?.id);

  // When maintenance mode is enabled for the user (and not bypassed), show only the maintenance menu
  if (effectiveMaintenanceMode) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="mb-2 items-center">
          <Link href="/" className="block">
            {displayState === "expanded" ? (
              <Image
                src="/images/bullyproof-logo.svg"
                alt="Bullyproof Logo"
                width={500}
                height={500}
                className="h-16 mt-4 w-auto"
              />
            ) : (
              <Image
                src="/images/bp-small-logo.svg"
                alt="Bullyproof Small Logo"
                width={500}
                height={500}
                className="h-10 mt-4 w-auto"
              />
            )}
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full">
            <NavMain items={maintenanceNavItems} title="Platform" />
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }

  // Check if welcome tutorial is completed
  const isWelcomeCompleted = React.useMemo(() => {
    if (!effectiveUser?.metadata) return false;
    const metadata = effectiveUser.metadata as any;
    return metadata?.tutorials?.welcome?.completed === true;
  }, [effectiveUser]);

  const platformItems = React.useMemo(() => {
    // If welcome is not completed, only show Welcome
    if (!isWelcomeCompleted) {
      return data.navBullyproof.filter((item) => item.title === "Welcome");
    }

    // If welcome is completed, show all items except Welcome
    return data.navBullyproof.filter((item) => {
      if (item.title === "Welcome") {
        return false; // Hide Welcome after completion
      }
      return true;
    });
  }, [isWelcomeCompleted]);

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

  // Get all feature keys from navigation items
  const allFeatureKeys = React.useMemo(() => {
    const keys = new Set<string>();
    [...data.navBullyproof, ...data.navSchoolMain, ...data.navCurriculum, ...data.navData].forEach(
      (item: any) => {
        if (item.feature) {
          keys.add(item.feature);
        }
      }
    );
    return Array.from(keys);
  }, []);

  // Check feature access for all navigation features
  // Use school ID from activeSchool if available, otherwise from path
  const schoolIdForFeatures = React.useMemo(() => {
    return activeSchool?.id || (schoolSlugFromPath ? undefined : activeSchool?.id);
  }, [activeSchool, schoolSlugFromPath]);

  const featuresAccess = useFeaturesAccess(allFeatureKeys, schoolIdForFeatures);

  // Resolve platform items: include when visible; lock when visible && !hasAccess
  const filteredPlatformItems = React.useMemo(() => {
    return platformItems
      .filter((item: any) => {
        if (item.feature) {
          const access = featuresAccess[item.feature];
          return access?.visible ?? false;
        }
        return true;
      })
      .map((item: any) => {
        if (item.feature) {
          const access = featuresAccess[item.feature];
          if (access?.visible && !access?.hasAccess) {
            return { ...item, disabled: true, disabledMessage: "Locked" };
          }
        }
        if (item.title === "Support") {
          return { ...item, onClick: () => openSupportEmail() };
        }
        return item;
      });
  }, [platformItems, featuresAccess]);

  // Resolve school main: include when visible; lock when visible && !hasAccess
  const filteredNavSchoolMain = React.useMemo(() => {
    return data.navSchoolMain
      .filter((item: any) => {
        if (item.feature) {
          const access = featuresAccess[item.feature];
          return access?.visible ?? false;
        }
        return true;
      })
      .map((item: any) => {
        if (item.feature) {
          const access = featuresAccess[item.feature];
          if (access?.visible && !access?.hasAccess) {
            return { ...item, disabled: true, disabledMessage: "Locked" };
          }
        }
        return item;
      });
  }, [featuresAccess]);

  // Resolve curriculum: include when visible; lock when visible && !hasAccess
  const filteredNavCurriculum = React.useMemo(() => {
    return data.navCurriculum
      .filter((item: any) => {
        if (item.feature) {
          const access = featuresAccess[item.feature];
          return access?.visible ?? false;
        }
        return true;
      })
      .map((item: any) => {
        if (item.feature) {
          const access = featuresAccess[item.feature];
          if (access?.visible && !access?.hasAccess) {
            return { ...item, disabled: true, disabledMessage: "Locked" };
          }
        }
        return item;
      });
  }, [featuresAccess]);

  // Resolve data: include when visible; lock when visible && !hasAccess
  const filteredNavData = React.useMemo(() => {
    return data.navData
      .filter((item: any) => {
        if (item.feature) {
          const access = featuresAccess[item.feature];
          return access?.visible ?? false;
        }
        return true;
      })
      .map((item: any) => {
        if (item.feature) {
          const access = featuresAccess[item.feature];
          if (access?.visible && !access?.hasAccess) {
            return { ...item, disabled: true, disabledMessage: "Locked" };
          }
        }
        return item;
      });
  }, [featuresAccess]);

  // Track if component has mounted to prevent hydration mismatch
  const [mounted, setMounted] = React.useState(false);

  const isLive = useLiveLessonStore((s) => s.isLive);
  const liveUrl = useLiveLessonStore((s) => s.getUrl());
  const liveLessonCount = useLiveLessonStore((s) => s.liveLessonCount);
  const needsSchoolSelection = useLiveLessonStore((s) => s.needsSchoolSelection);
  const fetchInProgressLesson = useLiveLessonStore(
    (s) => s.fetchInProgressLesson
  );
  
  const [showSchoolSelectionDialog, setShowSchoolSelectionDialog] = React.useState(false);

  // Set mounted to true after component mounts (client-side only)
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch in-progress lesson on mount and when user changes
  // Wait for session to be ready before fetching
  React.useEffect(() => {
    if (!effectiveUser?.id) return;

    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout | null = null;

    const checkSessionAndFetch = async () => {
      try {
        const { createBrowserClient } = await import("@/utils/supabase/client");
        const supabase = createBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        
        // Only fetch if we have a valid session token
        if (sessionData?.session?.access_token) {
          fetchInProgressLesson(effectiveUser.id);
        } else if (retryCount < maxRetries) {
          // Retry after a short delay if token isn't ready yet
          retryCount++;
          retryTimeout = setTimeout(() => {
            checkSessionAndFetch();
          }, 500);
        } else {
          // Max retries reached, give up silently
          console.warn("Session token not available after retries, skipping live lesson fetch");
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    checkSessionAndFetch();

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [effectiveUser?.id, fetchInProgressLesson]);

  const handleLiveLessonClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // If multiple schools, show dialog; otherwise navigate directly
    if (needsSchoolSelection()) {
      setShowSchoolSelectionDialog(true);
    } else {
      // Navigate directly - single school or single lesson
      const url = liveUrl;
      if (url) {
        router.push(url);
      }
    }
  }, [needsSchoolSelection, liveUrl, router]);

  const platformItemsWithLive = React.useMemo(() => {
    // Don't show live lesson if welcome is not completed
    if (!isWelcomeCompleted) {
      return filteredPlatformItems;
    }

    // Only add live lesson item after component has mounted to prevent hydration mismatch
    // This ensures server and client render the same initial HTML
    if (!mounted || !isLive || !liveUrl) return filteredPlatformItems;
    
    const items = [...filteredPlatformItems];
    const dashboardIndex = items.findIndex((i) => i.title === "Dashboard");
    const liveItem = {
      title: liveLessonCount > 1 ? "Live Lessons" : "Live Lesson",
      url: liveUrl,
      icon: TvMinimalPlay,
      isActive: false,
      disabled: false,
      feature: "live_lesson",
      disableActiveStyle: true,
      liveStyle: true,
      badge: liveLessonCount > 1 ? liveLessonCount : undefined,
      onClick: needsSchoolSelection() ? handleLiveLessonClick : undefined,
    };
    if (dashboardIndex !== -1) {
      items.splice(dashboardIndex + 1, 0, liveItem);
    } else {
      items.unshift(liveItem);
    }
    return items;
  }, [filteredPlatformItems, isLive, liveUrl, liveLessonCount, isWelcomeCompleted, mounted, needsSchoolSelection, handleLiveLessonClick]);

  return (
    <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="mb-2 items-center">
          <Link href="/" className="block">
          {displayState === "expanded" ? (
            <Image
              src="/images/bullyproof-logo.svg"
              alt="Bullyproof Logo"
              width={500}
              height={500}
              className="h-16 mt-4 w-auto"
            />
          ) : (
            <Image
              src="/images/bp-small-logo.svg"
              alt="Bullyproof Small Logo"
              width={500}
              height={500}
              className="h-10 mt-4 w-auto"
            />
          )}
        </Link>
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
                    {/* navCurriculum: 3 items, has title - title at 5, items at 6-8 */}
                    <NavMain
                      items={withSlug(filteredNavCurriculum)}
                      title="Bullyproof"
                      enableStaggeredAnimation
                      startIndex={5}
                    />
                    {/* navData: filtered based on role - title at 9, item at 10 */}
                    {filteredNavData.length > 0 && (
                      <NavMain
                        items={withSlug(filteredNavData)}
                        title="Admin"
                        enableStaggeredAnimation
                        startIndex={9}
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
      <SelectSchoolForLiveLessonsDialog
        open={showSchoolSelectionDialog}
        onOpenChange={setShowSchoolSelectionDialog}
      />
    </Sidebar>
  );
}
