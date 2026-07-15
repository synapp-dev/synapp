"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  Mail,
  MessageSquare,
  PanelsTopLeft,
  Phone,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  User,
  Users,
} from "lucide-react";

import { NavMain, type NavMainItem } from "@/components/organisms/nav-main";
import { CaseSwitcher } from "@/components/organisms/case-switcher";
import { NavUser } from "@/components/molecules/nav-user";
import { useMeStore } from "@/entities/me/model/store";
import { getUnreadMessageNotificationCount } from "@/entities/notifications/model/dummy-notifications";
import { getCaseSlugFromPathname, isKnownCaseSlug } from "@/lib/dummy-cases";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";

const LAST_CASE_SLUG_STORAGE_KEY = "youthjustice.sidebar.lastCaseSlug";

function readLastCaseSlugFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(LAST_CASE_SLUG_STORAGE_KEY);
    if (raw && isKnownCaseSlug(raw)) {
      return raw;
    }
  } catch {
    // private mode / blocked storage
  }
  return null;
}

function makeCaseNavItems(caseSlug: string): NavMainItem[] {
  const base = `/cases/${caseSlug}`;
  return [
    {
      title: "Overview",
      url: `${base}/overview`,
      icon: PanelsTopLeft,
      exact: false,
    },
    {
      title: "Correspondence",
      url: `${base}/correspondence`,
      icon: Mail,
      exact: false,
    },
    {
      title: "Calendar",
      url: `${base}/calendar`,
      icon: CalendarDays,
      exact: false,
    },
    {
      title: "Safety Plans",
      url: `${base}/safety-plans`,
      icon: Shield,
      exact: false,
    },
    {
      title: "Support Contacts",
      url: `${base}/support-contacts`,
      icon: Users,
      exact: false,
    },
    {
      title: "Meetings",
      url: `${base}/meetings`,
      icon: Phone,
      exact: false,
    },
    {
      title: "Documents",
      url: `${base}/documents`,
      icon: FolderOpen,
      exact: false,
    },
    {
      title: "Youth View",
      url: `${base}/youth-view`,
      icon: Smartphone,
      exact: false,
    },
  ];
}

function YouthJusticeSidebarBrand({
  compact,
  priority,
}: {
  compact: boolean;
  priority?: boolean;
}) {
  const logoHeight = compact ? "h-9" : "h-14";
  const starHeight = compact ? "h-4" : "h-6";
  return (
    <span className="flex w-full max-w-full items-center justify-center gap-4">
      <span className="relative flex min-w-0 shrink items-center justify-center">
        <Image
          src="/images/logos/youthjustice-logo-blue.svg"
          alt="Youth Justice"
          width={512}
          height={290}
          className={`${logoHeight} w-auto max-w-full dark:hidden`}
          priority={priority}
        />
        <Image
          src="/images/logos/youthjustice-logo-white.svg"
          alt="Youth Justice"
          width={512}
          height={290}
          className={`hidden ${logoHeight} w-auto max-w-full dark:block`}
          priority={priority}
        />
      </span>
      <span className="flex shrink-0 items-center justify-center" aria-hidden>
        <span className="size-1 shrink-0 rounded-full bg-muted-foreground/80" />
      </span>
      <span className="flex shrink-0 items-center justify-center">
        <Image
          src="/images/logos/intradark-blue-star.svg"
          alt=""
          width={42}
          height={36}
          className={`${starHeight} w-auto animate-[spin_12s_linear_infinite]`}
          aria-hidden
        />
      </span>
    </span>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const currentUser = useMeStore((state) => state.currentUser);
  const features = currentUser?.features ?? [];
  const canViewProfile =
    currentUser?.role === "admin" || features.includes("profile");
  const unreadMessageCount = getUnreadMessageNotificationCount();

  const caseSlug = getCaseSlugFromPathname(pathname);
  const [selectedCaseSlug, setSelectedCaseSlug] = useState<string | null>(() =>
    caseSlug && isKnownCaseSlug(caseSlug) ? caseSlug : null,
  );

  useLayoutEffect(() => {
    if (caseSlug && isKnownCaseSlug(caseSlug)) {
      setSelectedCaseSlug((prev) => (prev === caseSlug ? prev : caseSlug));
      return;
    }
    setSelectedCaseSlug((prev) => prev ?? readLastCaseSlugFromStorage());
  }, [caseSlug]);

  useEffect(() => {
    if (!selectedCaseSlug || !isKnownCaseSlug(selectedCaseSlug)) {
      return;
    }
    try {
      window.sessionStorage.setItem(
        LAST_CASE_SLUG_STORAGE_KEY,
        selectedCaseSlug,
      );
    } catch {
      // ignore
    }
  }, [selectedCaseSlug]);

  const platformNavItems = useMemo((): NavMainItem[] => {
    const base: NavMainItem[] = [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        title: "Messages",
        url: "/messages",
        icon: MessageSquare,
        badge: unreadMessageCount > 0 ? `${unreadMessageCount} new` : undefined,
        exact: false,
      },
      {
        title: "Concepts",
        url: "/concepts",
        icon: Sparkles,
        exact: true,
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        exact: true,
      },
    ];
    if (canViewProfile) {
      base.push({
        title: "Profile",
        url: "/profile",
        icon: User,
        exact: true,
      });
    }
    return base;
  }, [canViewProfile, unreadMessageCount]);

  const scopedNavItems = useMemo(() => {
    if (!selectedCaseSlug || !isKnownCaseSlug(selectedCaseSlug)) {
      return [];
    }
    return makeCaseNavItems(selectedCaseSlug);
  }, [selectedCaseSlug]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-2">
          <Link
            href="/home"
            className="flex w-full min-h-10 items-center justify-center px-2 py-4 group-data-[collapsible=icon]:hidden"
          >
            <YouthJusticeSidebarBrand compact={false} priority />
          </Link>
          <Link
            href="/home"
            className="hidden w-full min-h-10 items-center justify-center py-4 group-data-[collapsible=icon]:flex"
          >
            <YouthJusticeSidebarBrand compact />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain title="Platform" items={platformNavItems} />
        <Separator className="my-0.5" />
        <CaseSwitcher
          currentCaseSlug={selectedCaseSlug}
          onCaseChange={(selectedCase) =>
            setSelectedCaseSlug(selectedCase.slug)
          }
        />
        {scopedNavItems.length > 0 ? (
          <NavMain
            className="-mt-2"
            items={scopedNavItems}
            enableStaggeredAnimation
            staggerBaseDelay={0.06}
            staggerIncrementDelay={0.06}
          />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
