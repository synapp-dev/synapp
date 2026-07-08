"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BotMessageSquare,
  Boxes,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileDown,
  FileText,
  HardHat,
  LayoutDashboard,
  ListOrdered,
  Cpu,
  LifeBuoy,
  NotebookPen,
  Package,
  Plane,
  Receipt,
  Timer,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  Rocket,
  Settings,
  Shield,
  Building2,
  Plug,
  type LucideIcon,
} from "lucide-react";
import {
  NavMain,
  type LockedNavTarget,
  type NavMainItem,
  type NavMainSubItem,
} from "@/components/organisms/nav-main";
import { ReadinessNavModal } from "@/components/organisms/readiness-nav-modal";
import { ReadinessUnlockCelebration } from "@/components/organisms/readiness-unlock-celebration";
import {
  VenueSwitcher,
  type Venue,
} from "@/components/organisms/venue-switcher";
import { NavUser } from "@/components/shell/nav-user";
import { useScopedNavigation } from "@/entities/access/scoped-navigation-context";
import { useMeStore } from "@/entities/me/model/store";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import {
  getScopedSettingsAccess,
  type ScopedSettingsAccess,
} from "@/entities/access/scoped-settings-access";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";
import { SupersoltLogo } from "@/components/branding/supersolt-logo";
import { isReservedTopLevelSegment } from "@/lib/reserved-top-level-segments";
import { setVenueScopeCookieClient } from "@/lib/venue-scope-cookie";
import { useOnboardingStateQuery } from "@/entities/onboarding/model/use-onboarding-setup";
import type { ReadinessBlockerDto } from "@/entities/readiness/model/types";
import {
  pathSuffixFromScopedNavUrl,
  readinessModuleIdFromPathSuffix,
} from "@/entities/readiness/lib/module-paths";
import { useVenueReadinessQuery } from "@/entities/readiness/model/use-venue-readiness-query";
import { applyReadinessToNavItems } from "@/lib/readiness/apply-readiness-to-nav";
import { isFullSidebarUnlockedForDev } from "@/lib/dev-full-sidebar-unlock";

type AccessControlledItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  exact?: boolean;
  requiredRole?: "admin";
  featureFlag?: string;
  items?: AccessControlledSubItem[];
};

type AccessControlledSubItem = NavMainSubItem & {
  requiredRole?: "admin";
  featureFlag?: string;
};

const DEFAULT_SCOPED_SECTION_PATH = "insights/sales";
function buildScopedPath(
  organisationSlug: string,
  venueSlug: string,
  sectionPath: string,
) {
  return `/${organisationSlug}/${venueSlug}/${sectionPath}`;
}

function buildVenueNavigationPath(
  pathname: string,
  organisationSlug: string,
  venueSlug: string,
) {
  const segments = pathname.split("/").filter(Boolean);
  const [first, ...restAfterFirst] = segments;
  const rest = restAfterFirst.slice(1);
  const hasScopedRoute =
    segments.length >= 2 &&
    first !== undefined &&
    !isReservedTopLevelSegment(first);

  if (hasScopedRoute) {
    if (rest.length === 0) {
      return `/${organisationSlug}/${venueSlug}`;
    }

    return `/${organisationSlug}/${venueSlug}/${rest.join("/")}`;
  }

  // Unscoped app shell routes (e.g. /agent, /dashboard): keep the path when the
  // venue switcher resolves — do not force a jump into scoped insights.
  if (first !== undefined && isReservedTopLevelSegment(first)) {
    return `/${segments.join("/")}`;
  }

  return `/${organisationSlug}/${venueSlug}/${DEFAULT_SCOPED_SECTION_PATH}`;
}

function makeScopedHomeNavItems(
  organisationSlug: string,
  venueSlug: string,
): AccessControlledItem[] {
  return [
    {
      title: "Agent",
      url: buildScopedPath(organisationSlug, venueSlug, "agent"),
      icon: BotMessageSquare,
      exact: true,
    },
    {
      title: "Dashboard",
      url: buildScopedPath(organisationSlug, venueSlug, "dashboard"),
      icon: LayoutDashboard,
      exact: true,
    },
  ];
}

function makePlatformNavItems(
  organisationSlug: string,
  venueSlug: string,
): AccessControlledItem[] {
  return [
    ...makeScopedHomeNavItems(organisationSlug, venueSlug),
    {
      title: "Insights",
      url: buildScopedPath(organisationSlug, venueSlug, "insights"),
      icon: BarChart3,
      items: [
        {
          title: "Sales",
          url: buildScopedPath(organisationSlug, venueSlug, "insights/sales"),
          icon: TrendingUp,
        },
        {
          title: "Labour",
          url: buildScopedPath(organisationSlug, venueSlug, "insights/labour"),
          icon: HardHat,
        },
        {
          title: "Inventory",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "insights/inventory",
          ),
          icon: Boxes,
        },
        {
          title: "P&L",
          url: buildScopedPath(organisationSlug, venueSlug, "insights/p-and-l"),
          icon: FileText,
        },
      ],
    },
    {
      title: "Purchasing",
      url: buildScopedPath(organisationSlug, venueSlug, "purchasing/orders"),
      icon: Package,
      items: [
        {
          title: "Orders",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "purchasing/orders",
          ),
          icon: ClipboardList,
        },
        {
          title: "Invoices",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "purchasing/invoices",
          ),
          icon: Receipt,
        },
        {
          title: "Suppliers",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "purchasing/suppliers",
          ),
          icon: Truck,
        },
      ],
    },
    {
      title: "Stock Management",
      url: buildScopedPath(
        organisationSlug,
        venueSlug,
        "stock-management/stock-counts",
      ),
      icon: BookOpen,
      items: [
        {
          title: "Stock Counts",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "stock-management/stock-counts",
          ),
          icon: ListOrdered,
        },
        {
          title: "Waste",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "stock-management/waste",
          ),
          icon: Trash2,
        },
      ],
    },
    {
      title: "Workforce",
      url: buildScopedPath(organisationSlug, venueSlug, "workforce"),
      icon: Users,
      items: [
        {
          title: "People",
          url: buildScopedPath(organisationSlug, venueSlug, "workforce/people"),
          icon: Users,
        },
        {
          title: "Roster",
          url: buildScopedPath(organisationSlug, venueSlug, "workforce/roster"),
          icon: CalendarDays,
        },
        {
          title: "Availability",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "workforce/availability",
          ),
          icon: Clock3,
        },
        {
          title: "Leave",
          url: buildScopedPath(organisationSlug, venueSlug, "workforce/leave"),
          icon: Plane,
        },
        {
          title: "Timesheets",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "workforce/timesheets",
          ),
          icon: Timer,
        },
        {
          title: "Payroll Export",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "workforce/payroll-export",
          ),
          icon: FileDown,
        },
      ],
    },
    {
      title: "Operations",
      url: buildScopedPath(organisationSlug, venueSlug, "operations"),
      icon: ClipboardList,
      items: [
        {
          title: "Daybook",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "operations/daybook",
          ),
          icon: NotebookPen,
        },
      ],
    },
    {
      title: "Settings",
      url: buildScopedPath(organisationSlug, venueSlug, "settings"),
      icon: Settings,
      items: [
        {
          title: "Permissions",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "settings/permissions",
          ),
          icon: Shield,
        },
        {
          title: "Organisation",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "settings/organisation",
          ),
          icon: Building2,
        },
        {
          title: "Integrations",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "settings/integrations",
          ),
          icon: Plug,
        },
        {
          title: "Inventory Setup",
          url: buildScopedPath(
            organisationSlug,
            venueSlug,
            "settings/inventory-setup",
          ),
          icon: Package,
        },
      ],
    },
  ];
}

function applySettingsNavAccess(
  items: AccessControlledItem[],
  access: ScopedSettingsAccess,
): AccessControlledItem[] {
  return items
    .map((item) => {
      if (item.title !== "Settings" || !item.items) {
        return item;
      }
      if (!access.canSeeSettingsNav) {
        return null;
      }
      const children = item.items.filter((child) => {
        if (child.url.endsWith("/settings/permissions")) {
          return access.canSeePermissions;
        }
        if (child.url.endsWith("/settings/organisation")) {
          return access.canSeeOrganisation;
        }
        if (child.url.endsWith("/settings/integrations")) {
          return access.canSeePermissions;
        }
        if (
          child.url.endsWith("/settings/inventory-setup") ||
          child.url.endsWith("/settings/inventory")
        ) {
          return access.canSeeSettingsNav;
        }
        return true;
      });
      if (children.length === 0) {
        return null;
      }
      return { ...item, items: children };
    })
    .filter((item): item is AccessControlledItem => item !== null);
}

const helpNavItems: NavMainItem[] = [
  {
    title: "About",
    url: "/about",
    icon: Cpu,
    exact: true,
  },
  {
    title: "Support",
    url: "/support",
    icon: LifeBuoy,
  },
];

const setupOnlyPlatformNavItems: NavMainItem[] = [
  {
    title: "Setup",
    url: "/setup",
    icon: Rocket,
    exact: true,
  },
];

function canAccessNavItem(
  item: { requiredRole?: "admin"; featureFlag?: string },
  role: string | null | undefined,
  features: string[],
) {
  if (item.requiredRole && role !== item.requiredRole) {
    return false;
  }

  if (item.featureFlag && !features.includes(item.featureFlag)) {
    return false;
  }

  return true;
}

function getVisiblePlatformItems(
  items: AccessControlledItem[],
  role: string | null | undefined,
  features: string[],
): NavMainItem[] {
  return items.reduce<NavMainItem[]>((acc, item) => {
    const visibleChildren = (item.items ?? []).filter((child) =>
      canAccessNavItem(child, role, features),
    );
    const parentVisible = canAccessNavItem(item, role, features);
    const hasVisibleChildren = visibleChildren.length > 0;

    if (!parentVisible && !hasVisibleChildren) {
      return acc;
    }

    acc.push({
      title: item.title,
      url: item.url,
      icon: item.icon,
      exact: item.exact,
      items: hasVisibleChildren ? visibleChildren : undefined,
    });
    return acc;
  }, []);
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useMeStore((state) => state.currentUser);
  const features = currentUser?.features ?? [];
  const { data: onboardingState } = useOnboardingStateQuery();
  const needsSetupNav =
    !isFullSidebarUnlockedForDev() &&
    (Boolean(currentUser?.needsSetup) ||
      (pathname.startsWith("/setup") &&
        (!onboardingState || !onboardingState.completed)));
  const topPlatformNavItems = useMemo(() => {
    if (!needsSetupNav) {
      return [];
    }
    return setupOnlyPlatformNavItems;
  }, [needsSetupNav]);

  const { activeScopedContext, resolvedScope, setScopedContext } =
    useScopedNavigation();

  useEffect(() => {
    if (
      !needsSetupNav ||
      !onboardingState ||
      onboardingState.completed ||
      !onboardingState.organisationSlug ||
      !onboardingState.primaryVenueSlug
    ) {
      return;
    }
    setScopedContext({
      organisationSlug: onboardingState.organisationSlug,
      venueSlug: onboardingState.primaryVenueSlug,
    });
    setVenueScopeCookieClient({
      organisationSlug: onboardingState.organisationSlug,
      venueSlug: onboardingState.primaryVenueSlug,
    });
  }, [needsSetupNav, onboardingState, setScopedContext]);
  const { data: accessOrganisations = [] } = useAccessibleVenueGroupsQuery({
    enabled: Boolean(resolvedScope?.organisationSlug),
  });

  const scopedGrantsOrgAdmin = useMemo(() => {
    if (!resolvedScope?.organisationSlug) {
      return false;
    }
    return (
      accessOrganisations.find((o) => o.slug === resolvedScope.organisationSlug)
        ?.grantsOrgAdmin ?? false
    );
  }, [accessOrganisations, resolvedScope?.organisationSlug]);

  const navRoleForScopedItems = scopedGrantsOrgAdmin ? "admin" : null;

  const platformNavItems = useMemo(() => {
    if (!resolvedScope) {
      return [];
    }

    const base = makePlatformNavItems(
      resolvedScope.organisationSlug,
      resolvedScope.venueSlug,
    );
    const settingsAccess = getScopedSettingsAccess(
      accessOrganisations,
      resolvedScope.organisationSlug,
      resolvedScope.venueSlug,
    );
    return applySettingsNavAccess(base, settingsAccess);
  }, [resolvedScope, accessOrganisations]);
  const visiblePlatformItems = getVisiblePlatformItems(
    platformNavItems,
    navRoleForScopedItems,
    features,
  );

  const { data: rawVenueReadiness } = useVenueReadinessQuery({
    organisationSlug: resolvedScope?.organisationSlug,
    venueSlug: resolvedScope?.venueSlug,
    enabled: Boolean(resolvedScope && !needsSetupNav),
  });

  // Dev-only escape hatch: drop readiness/account-setup gating so every module
  // (Stock Management, etc.) shows unlocked. RBAC controls are untouched.
  const venueReadiness = useMemo(() => {
    if (!rawVenueReadiness || !isFullSidebarUnlockedForDev()) {
      return rawVenueReadiness;
    }
    return { ...rawVenueReadiness, appliesGating: false };
  }, [rawVenueReadiness]);

  const readinessNavItems = useMemo(
    () => applyReadinessToNavItems(visiblePlatformItems, venueReadiness ?? null),
    [visiblePlatformItems, venueReadiness],
  );

  const [readinessModal, setReadinessModal] = useState<{
    moduleTitle: string;
    blockers: ReadinessBlockerDto[];
  } | null>(null);

  const handleLockedNavClick = (target: LockedNavTarget) => {
    const suffix = pathSuffixFromScopedNavUrl(target.url);
    const moduleId = suffix ? readinessModuleIdFromPathSuffix(suffix) : null;
    const moduleState =
      (moduleId
        ? venueReadiness?.modulesDetailed.find(
            (candidate) => candidate.id === moduleId,
          )
        : null) ??
      venueReadiness?.modulesDetailed.find(
        (candidate) =>
          candidate.status !== "unlocked" && candidate.title === target.title,
      ) ??
      venueReadiness?.modulesDetailed.find(
        (candidate) => candidate.status !== "unlocked",
      );

    if (!moduleState?.blockers.length) {
      return;
    }

    setReadinessModal({
      moduleTitle: target.title,
      blockers: moduleState.blockers,
    });
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-2">
          <div className="flex min-h-10 items-center justify-center px-2 py-4 group-data-[collapsible=icon]:hidden">
            <SupersoltLogo
              variant="wordmark"
              className="h-16 w-auto"
              priority
            />
          </div>
          <div className="hidden min-h-10 w-full items-center justify-center group-data-[collapsible=icon]:flex">
            <SupersoltLogo variant="mark" className="h-8 w-auto" priority />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {topPlatformNavItems.length > 0 ? (
          <NavMain title="Platform" items={topPlatformNavItems} />
        ) : null}
        {!needsSetupNav ? (
          <>
            <Separator className="my-0.5" />
            <VenueSwitcher
              currentOrganisationSlug={
                activeScopedContext?.organisationSlug ?? null
              }
              currentVenueSlug={activeScopedContext?.venueSlug ?? null}
              onVenueChange={(venue: Venue) => {
                const nextScope = {
                  organisationSlug: venue.organisationSlug,
                  venueSlug: venue.slug,
                };
                setScopedContext(nextScope);
                setVenueScopeCookieClient(nextScope);
                const nextPath = buildVenueNavigationPath(
                  pathname,
                  venue.organisationSlug,
                  venue.slug,
                );
                router.push(nextPath);
              }}
            />
          </>
        ) : null}
        {resolvedScope && !needsSetupNav ? (
          <NavMain
            className="-mt-2"
            items={readinessNavItems}
            enableStaggeredAnimation
            staggerBaseDelay={0.06}
            staggerIncrementDelay={0.06}
            onLockedNavClick={venueReadiness?.appliesGating ? handleLockedNavClick : undefined}
          />
        ) : null}
        <NavMain className="mt-auto" items={helpNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      {resolvedScope && !needsSetupNav && venueReadiness?.appliesGating ? (
        <>
          <ReadinessNavModal
            open={Boolean(readinessModal)}
            onOpenChange={(open) => {
              if (!open) {
                setReadinessModal(null);
              }
            }}
            moduleTitle={readinessModal?.moduleTitle ?? ""}
            moduleId={null}
            blockers={readinessModal?.blockers ?? []}
            organisationSlug={resolvedScope.organisationSlug}
            venueSlug={resolvedScope.venueSlug}
          />
          <ReadinessUnlockCelebration
            organisationSlug={resolvedScope.organisationSlug}
            venueSlug={resolvedScope.venueSlug}
          />
        </>
      ) : null}
    </Sidebar>
  );
}
