import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Film,
  LayoutDashboard,
  List,
  MapPin,
  MessageSquare,
  Newspaper,
  Play,
  Server,
  Shield,
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
  play: { label: "Play", icon: Play },
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  matches: { label: "Matches", icon: Trophy },
  match: { label: "Match", icon: Trophy },
  positions: { label: "Positions", icon: MapPin },
  crew: { label: "Crew", icon: Users },
  server: { label: "Server", icon: Server },
  teams: { label: "Teams", icon: Users },
  players: { label: "Players", icon: UserRound },
  scrims: { label: "Scrims", icon: Swords },
  tournaments: { label: "Tournaments", icon: CalendarDays },
  news: { label: "News", icon: Newspaper },
  forums: { label: "Forums", icon: MessageSquare },
  media: { label: "Media", icon: Film },
  theory: { label: "Theory", icon: BookOpen },
  utility: { label: "Utility", icon: Wrench },
  stats: { label: "Stats", icon: BarChart3 },
  watchlist: { label: "Watchlist", icon: List },
  admin: { label: "Admin", icon: Shield },
  sandbox: { label: "Sandbox", icon: SquareStack },
};

export type NavMainSidebarItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  exact?: boolean;
  items?: { title: string; url: string; icon?: LucideIcon; exact?: boolean }[];
};

/** Static platform links (Admin, with optional Sandbox child, are prepended in `AppSidebar` from RBAC). */
export function getNavPlatformBase(): NavMainSidebarItem[] {
  return [
    { title: "Play", url: "/play", icon: Play, exact: true },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    { title: "Server", url: "/server", icon: Server },
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
];

export const navKnowledge: NavMainSidebarItem[] = [
  { title: "Theory", url: "/theory", icon: BookOpen },
  { title: "Utility", url: "/utility", icon: Wrench },
];

export const navInsight: NavMainSidebarItem[] = [
  { title: "Stats", url: "/stats", icon: BarChart3 },
  { title: "Watchlist", url: "/watchlist", icon: List },
];

export function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) =>
      word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
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
    const label = meta?.label ?? formatSegment(segment);

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
