"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BotMessageSquare,
  Boxes,
  CalendarDays,
  Carrot,
  ClipboardList,
  Clock3,
  CookingPot,
  FileDown,
  FileText,
  HardHat,
  LayoutDashboard,
  LifeBuoy,
  NotebookPen,
  PackageCheck,
  Plane,
  Receipt,
  ShoppingCart,
  Timer,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { NavMain, type NavMainItem, type NavMainSubItem } from "@/components/organisms/nav-main";
import { VenueSwitcher, type Venue } from "@/components/organisms/venue-switcher";
import { NavUser } from "@/components/molecules/nav-user";
import { useMeStore } from "@/entities/me/model/store";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";

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
const RESERVED_TOP_LEVEL_SEGMENTS = new Set([
  "auth",
  "agent",
  "dashboard",
  "support",
  "settings",
  "logout",
  "api",
  "_next",
]);

function buildScopedPath(
  organisationSlug: string,
  venueSlug: string,
  sectionPath: string
) {
  return `/${organisationSlug}/${venueSlug}/${sectionPath}`;
}

function getScopedContext(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [first, second] = segments;
  if (
    !first ||
    !second ||
    first === "auth" ||
    first === "agent" ||
    first === "dashboard" ||
    first === "support" ||
    first === "settings" ||
    first === "logout"
  ) {
    return null;
  }

  return {
    organisationSlug: first,
    venueSlug: second,
  };
}

function buildVenueNavigationPath(
  pathname: string,
  organisationSlug: string,
  venueSlug: string
) {
  const segments = pathname.split("/").filter(Boolean);
  const [first, ...restAfterFirst] = segments;
  const rest = restAfterFirst.slice(1);
  const hasScopedRoute =
    segments.length >= 2 &&
    first !== undefined &&
    !RESERVED_TOP_LEVEL_SEGMENTS.has(first);

  if (hasScopedRoute) {
    if (rest.length === 0) {
      return `/${organisationSlug}/${venueSlug}`;
    }

    return `/${organisationSlug}/${venueSlug}/${rest.join("/")}`;
  }

  return `/${organisationSlug}/${venueSlug}/${DEFAULT_SCOPED_SECTION_PATH}`;
}

function makePlatformNavItems(
  organisationSlug: string,
  venueSlug: string
): AccessControlledItem[] {
  return [
    {
      title: "Insights",
      url: buildScopedPath(organisationSlug, venueSlug, "insights"),
      icon: BarChart3,
      items: [
        { title: "Sales", url: buildScopedPath(organisationSlug, venueSlug, "insights/sales"), icon: TrendingUp },
        { title: "Labour", url: buildScopedPath(organisationSlug, venueSlug, "insights/labour"), icon: HardHat },
        { title: "Inventory", url: buildScopedPath(organisationSlug, venueSlug, "insights/inventory"), icon: Boxes },
        { title: "P&L", url: buildScopedPath(organisationSlug, venueSlug, "insights/p-and-l"), icon: FileText },
      ],
    },
    {
      title: "Menu",
      url: buildScopedPath(organisationSlug, venueSlug, "menu"),
      icon: UtensilsCrossed,
      items: [
        { title: "Recipes", url: buildScopedPath(organisationSlug, venueSlug, "menu/recipes"), icon: CookingPot },
        { title: "Menu Items", url: buildScopedPath(organisationSlug, venueSlug, "menu/menu-items"), icon: ClipboardList },
        { title: "Ingredients", url: buildScopedPath(organisationSlug, venueSlug, "menu/ingredients"), icon: Carrot },
      ],
    },
    {
      title: "Inventory",
      url: buildScopedPath(organisationSlug, venueSlug, "inventory"),
      icon: Boxes,
      items: [
        { title: "Overview", url: buildScopedPath(organisationSlug, venueSlug, "inventory/overview"), icon: LayoutDashboard },
        { title: "Order Guide", url: buildScopedPath(organisationSlug, venueSlug, "inventory/order-guide"), icon: FileText },
        { title: "Purchase Orders", url: buildScopedPath(organisationSlug, venueSlug, "inventory/purchase-orders"), icon: ShoppingCart },
        { title: "Invoices", url: buildScopedPath(organisationSlug, venueSlug, "inventory/invoices"), icon: Receipt },
        { title: "Stock Counts", url: buildScopedPath(organisationSlug, venueSlug, "inventory/stock-counts"), icon: PackageCheck },
        { title: "Waste", url: buildScopedPath(organisationSlug, venueSlug, "inventory/waste"), icon: Trash2 },
        { title: "Suppliers", url: buildScopedPath(organisationSlug, venueSlug, "inventory/suppliers"), icon: Truck },
      ],
    },
    {
      title: "Workforce",
      url: buildScopedPath(organisationSlug, venueSlug, "workforce"),
      icon: Users,
      items: [
        { title: "People", url: buildScopedPath(organisationSlug, venueSlug, "workforce/people"), icon: Users },
        { title: "Roster", url: buildScopedPath(organisationSlug, venueSlug, "workforce/roster"), icon: CalendarDays },
        { title: "Availability", url: buildScopedPath(organisationSlug, venueSlug, "workforce/availability"), icon: Clock3 },
        { title: "Leave", url: buildScopedPath(organisationSlug, venueSlug, "workforce/leave"), icon: Plane },
        { title: "Timesheets", url: buildScopedPath(organisationSlug, venueSlug, "workforce/timesheets"), icon: Timer },
        { title: "Payroll Export", url: buildScopedPath(organisationSlug, venueSlug, "workforce/payroll-export"), icon: FileDown },
      ],
    },
    {
      title: "Operations",
      url: buildScopedPath(organisationSlug, venueSlug, "operations"),
      icon: ClipboardList,
      items: [
        { title: "Daybook", url: buildScopedPath(organisationSlug, venueSlug, "operations/daybook"), icon: NotebookPen },
      ],
    },
  ];
}

const topPlatformNavItems: NavMainItem[] = [
  {
    title: "Agent",
    url: "/agent",
    icon: BotMessageSquare,
    exact: true,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Support",
    url: "/support",
    icon: LifeBuoy,
  },
];

function canAccessNavItem(
  item: { requiredRole?: "admin"; featureFlag?: string },
  role: string | null | undefined,
  features: string[]
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
  features: string[]
): NavMainItem[] {
  return items.reduce<NavMainItem[]>((acc, item) => {
    const visibleChildren = (item.items ?? []).filter((child) =>
      canAccessNavItem(child, role, features)
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
  const activeScopedContext = useMemo(() => getScopedContext(pathname), [pathname]);
  const [selectedScopedContext, setSelectedScopedContext] = useState<{
    organisationSlug: string;
    venueSlug: string;
  } | null>(activeScopedContext);

  useEffect(() => {
    if (!activeScopedContext) {
      return;
    }

    setSelectedScopedContext((previous) => {
      if (
        previous?.organisationSlug === activeScopedContext.organisationSlug &&
        previous?.venueSlug === activeScopedContext.venueSlug
      ) {
        return previous;
      }

      return activeScopedContext;
    });
  }, [activeScopedContext?.organisationSlug, activeScopedContext?.venueSlug]);

  const resolvedScope = selectedScopedContext ?? activeScopedContext;
  const { data: accessOrganisations = [] } = useAccessibleVenueGroupsQuery({
    enabled: Boolean(resolvedScope?.organisationSlug),
  });

  const scopedGrantsOrgAdmin = useMemo(() => {
    if (!resolvedScope?.organisationSlug) {
      return false;
    }
    return (
      accessOrganisations.find((o) => o.slug === resolvedScope.organisationSlug)?.grantsOrgAdmin ?? false
    );
  }, [accessOrganisations, resolvedScope?.organisationSlug]);

  const navRoleForScopedItems = scopedGrantsOrgAdmin ? "admin" : null;

  const platformNavItems = useMemo(() => {
    if (!resolvedScope) {
      return [];
    }

    return makePlatformNavItems(
      resolvedScope.organisationSlug,
      resolvedScope.venueSlug
    );
  }, [resolvedScope]);
  const visiblePlatformItems = getVisiblePlatformItems(
    platformNavItems,
    navRoleForScopedItems,
    features
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-2">
          <div className="flex min-h-10 items-center justify-center px-2 py-4 group-data-[collapsible=icon]:hidden">
            <Image
              src="/images/supersolt-logowordmark-black.svg"
              alt="Supersolt"
              width={360}
              height={144}
              className="h-16 w-auto dark:hidden"
              priority
            />
            <Image
              src="/images/supersolt-logowordmark-white.svg"
              alt="Supersolt"
              width={360}
              height={144}
              className="hidden h-16 w-auto dark:block"
              priority
            />
          </div>
          <div className="hidden min-h-10 items-center justify-center group-data-[collapsible=icon]:flex">
            <Image
              src="/images/supersolt-logo-black.svg"
              alt="Supersolt icon"
              width={151}
              height={144}
              className="h-7 w-auto dark:hidden"
              priority
            />
            <Image
              src="/images/supersolt-logo-white.svg"
              alt="Supersolt icon"
              width={151}
              height={144}
              className="hidden h-7 w-auto dark:block"
              priority
            />
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <NavMain title="Platform" items={topPlatformNavItems} />
        <Separator className="my-0.5" />
        <VenueSwitcher
          currentOrganisationSlug={activeScopedContext?.organisationSlug ?? null}
          currentVenueSlug={activeScopedContext?.venueSlug ?? null}
          onVenueChange={(venue: Venue) => {
            setSelectedScopedContext({
              organisationSlug: venue.organisationSlug,
              venueSlug: venue.slug,
            });
            const nextPath = buildVenueNavigationPath(
              pathname,
              venue.organisationSlug,
              venue.slug
            );
            router.push(nextPath);
          }}
        />
        {resolvedScope ? (
          <NavMain
            className="-mt-2"
            items={visiblePlatformItems}
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
