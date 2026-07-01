import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  Film,
  LayoutDashboard,
  MapPin,
  Medal,
  MessageSquare,
  Newspaper,
  Play,
  Shield,
  Sparkles,
  SquareStack,
  Swords,
  Trophy,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

/** First URL segment → sidebar label + icon (breadcrumb uses same map). */
export const MAIN_NAV_SEGMENT_META: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  welcome: { label: "Welcome", icon: Sparkles },
  play: { label: "Play", icon: Play },
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  matches: { label: "Matches", icon: Trophy },
  match: { label: "Match", icon: Trophy },
  positions: { label: "Positions", icon: MapPin },
  crew: { label: "Crew", icon: Users },
  teams: { label: "Teams", icon: Users },
  players: { label: "Players", icon: UserRound },
  scrims: { label: "Scrims", icon: Swords },
  tournaments: { label: "Tournaments", icon: CalendarDays },
  leaderboards: { label: "Leaderboards", icon: Medal },
  news: { label: "News", icon: Newspaper },
  forums: { label: "Forums", icon: MessageSquare },
  media: { label: "Media", icon: Film },
  theory: { label: "Theory", icon: BookOpen },
  utility: { label: "Utility", icon: Wrench },
  admin: { label: "Admin", icon: Shield },
  sandbox: { label: "Sandbox", icon: SquareStack },
};

export type NavMainSidebarItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  disableActiveStyle?: boolean;
  liveStyle?: boolean;
  badge?: number | string;
  items?: { title: string; url: string; icon?: LucideIcon; exact?: boolean }[];
};

/** Static platform links (Admin, with optional Sandbox child, are prepended in `AppSidebar` from RBAC). */
export function getNavPlatformBase(): NavMainSidebarItem[] {
  return [
    { title: "Welcome", url: "/welcome", icon: Sparkles, exact: true },
    { title: "Play", url: "/play", icon: Play, exact: true },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
  ];
}

export const navCommunity: NavMainSidebarItem[] = [
  { title: "News", url: "/news", icon: Newspaper },
  { title: "Forums", url: "/forums", icon: MessageSquare },
  { title: "Media", url: "/media", icon: Film },
];

export const navCompetitive: NavMainSidebarItem[] = [
  { title: "Teams", url: "/teams", icon: Users },
  { title: "Players", url: "/players", icon: UserRound },
  { title: "Scrims", url: "/scrims", icon: Swords },
  { title: "Tournaments", url: "/tournaments", icon: CalendarDays },
  { title: "Leaderboards", url: "/leaderboards/deathmatch", icon: Medal },
];

export const navKnowledge: NavMainSidebarItem[] = [
  { title: "Theory", url: "/theory", icon: BookOpen },
  { title: "Utility", url: "/utility", icon: Wrench },
];

export function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) =>
      word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/** CS / CS2-style map slugs (e.g. `de_mirage`, `cs_office`) → short display name for breadcrumbs. */
export function formatUtilityMapSlugLabel(slug: string): string {
  const rest = slug.replace(/^(de|cs|ar|gd)_/i, "");
  const core = rest.length > 0 ? rest : slug;
  return core
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => {
      if (word.length === 0) return word;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export type BreadcrumbTrailCrumb = {
  href: string;
  /** Visible text; may be hidden in UI when `iconOnlyDisplay` is true. */
  label: string;
  icon?: LucideIcon;
  /** When true, render icon only in the bar (still use `label` for `aria-label`). */
  iconOnlyDisplay: boolean;
};

/**
 * Builds URL-prefix crumbs for the header breadcrumb.
 * Icons apply only to the first segment that appears in `MAIN_NAV_SEGMENT_META`.
 * If there are ≥4 segments, that icon crumb drops its visible label (icon only).
 */
export function buildBreadcrumbTrail(pathname: string | null): {
  crumbs: BreadcrumbTrailCrumb[];
  segmentCount: number;
} {
  if (!pathname || pathname === "/") {
    return { crumbs: [], segmentCount: 0 };
  }

  const segments = pathname.split("/").filter(Boolean);
  const segmentCount = segments.length;

  let mainNavIndex = -1;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg && MAIN_NAV_SEGMENT_META[seg]) {
      mainNavIndex = i;
      break;
    }
  }

  const deep = segmentCount >= 4;

  const crumbs: BreadcrumbTrailCrumb[] = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const meta = segment ? MAIN_NAV_SEGMENT_META[segment] : undefined;
    const afterUtility =
      index > 0 && segments[index - 1] === "utility" && segment;
    const label =
      meta?.label ??
      (afterUtility
        ? formatUtilityMapSlugLabel(segment)
        : formatSegment(segment));

    const isMainNavCrumb = index === mainNavIndex;
    const icon = isMainNavCrumb ? meta?.icon : undefined;
    const iconOnlyDisplay = Boolean(
      icon && deep && isMainNavCrumb,
    );

    return {
      href,
      label,
      icon,
      iconOnlyDisplay,
    };
  });

  return { crumbs, segmentCount };
}
