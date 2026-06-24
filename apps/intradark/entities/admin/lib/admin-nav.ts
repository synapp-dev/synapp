import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Code2,
  Film,
  Map,
  Medal,
  MessageSquare,
  Newspaper,
  Server,
  SquareStack,
  Swords,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

import {
  ROLE_DEVELOPER,
  ROLE_NEWS_EDITOR,
  ROLE_SANDBOX_ACCESS,
} from "./rbac-constants";
import { hasCapability, hasRoleSlug } from "./role-slugs";

export type AdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Capability / role required to enter the route. */
  requiredSlug: string;
  /**
   * When true, the literal role slug is required (no `developer`-implies-all).
   * Matches routes gated with `hasRoleSlug(slugs, ROLE_DEVELOPER)`.
   */
  exactRole?: boolean;
  /**
   * Sub-sections shown as cards on this item's index page. The parent `href`
   * is a landing page; children link out to their own (possibly non-nested)
   * routes and drive the parent tab's active state.
   */
  children?: AdminNavItem[];
};

/**
 * Admin subroutes in tab / card order. Single source of truth for the
 * sidebar-less admin shell: the `/admin` landing cards and the layout tab bar
 * both render from this list and gate visibility with {@link canAccessAdminItem}.
 * Items with `children` are section landing pages (see {@link adminItemHrefs}).
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // Community
  {
    title: "News",
    href: "/news/admin",
    icon: Newspaper,
    description: "Author and edit news articles.",
    requiredSlug: ROLE_NEWS_EDITOR,
  },
  {
    title: "Forums",
    href: "/admin/forums",
    icon: MessageSquare,
    description: "Boards, categories, and post moderation.",
    requiredSlug: ROLE_DEVELOPER,
    exactRole: true,
  },
  {
    title: "Media",
    href: "/admin/media",
    icon: Film,
    description: "Curate clips, VODs, and featured media.",
    requiredSlug: ROLE_DEVELOPER,
    exactRole: true,
  },

  // Competitive
  {
    title: "Teams",
    href: "/admin/teams",
    icon: Users,
    description: "Manage rosters, team profiles, and verification.",
    requiredSlug: ROLE_DEVELOPER,
    exactRole: true,
  },
  {
    title: "Players",
    href: "/admin/players",
    icon: UserRound,
    description: "Player profiles, accounts, and moderation actions.",
    requiredSlug: ROLE_DEVELOPER,
    exactRole: true,
  },
  {
    title: "Scrims",
    href: "/admin/scrims",
    icon: Swords,
    description: "Scrim scheduling, matchmaking, and dispute review.",
    requiredSlug: ROLE_DEVELOPER,
    exactRole: true,
  },
  {
    title: "Tournaments",
    href: "/admin/tournaments",
    icon: CalendarDays,
    description: "Create brackets, manage stages, and seed entrants.",
    requiredSlug: ROLE_DEVELOPER,
    exactRole: true,
  },
  {
    title: "Leaderboards",
    href: "/admin/leaderboards",
    icon: Medal,
    description: "Season config, rankings, and stat recalculation.",
    requiredSlug: ROLE_DEVELOPER,
    exactRole: true,
  },

  // Knowledge
  {
    title: "Theory",
    href: "/admin/theory",
    icon: BookOpen,
    description: "Author theory articles, guides, and learning paths.",
    requiredSlug: ROLE_DEVELOPER,
    exactRole: true,
  },
  {
    title: "Utility",
    href: "/admin/utility",
    icon: Wrench,
    description: "Community utility lineup submissions and review tools.",
    requiredSlug: ROLE_DEVELOPER,
    exactRole: true,
    children: [
      {
        title: "Pending lineups",
        href: "/admin/utility/pending",
        icon: ClipboardCheck,
        description:
          "Review and publish community utility lineup submissions.",
        requiredSlug: ROLE_DEVELOPER,
        exactRole: true,
      },
    ],
  },

  // Platform tools
  {
    title: "DevTools",
    href: "/admin/devtools",
    icon: Code2,
    description: "Staff-only simulators and infrastructure controls.",
    requiredSlug: ROLE_SANDBOX_ACCESS,
    children: [
      {
        title: "Sandbox",
        href: "/admin/sandbox",
        icon: SquareStack,
        description: "UX simulators without real users or OAuth.",
        requiredSlug: ROLE_SANDBOX_ACCESS,
      },
      {
        title: "Servers",
        href: "/admin/servers",
        icon: Server,
        description:
          "List, power-cycle, and tear down CS2 game servers via Redline.",
        requiredSlug: ROLE_SANDBOX_ACCESS,
      },
      {
        title: "Maps",
        href: "/admin/maps",
        icon: Map,
        description:
          "Canonical maps table, radar assets, and utility map spots.",
        requiredSlug: ROLE_DEVELOPER,
        exactRole: true,
      },
    ],
  },
];

/** Whether `slugs` may enter the given admin item's route. */
export function canAccessAdminItem(
  item: AdminNavItem,
  slugs: readonly string[],
): boolean {
  return item.exactRole
    ? hasRoleSlug(slugs, item.requiredSlug)
    : hasCapability(slugs, item.requiredSlug);
}

/**
 * Every route an item "owns" — its own href plus any child hrefs. Used for tab
 * active-state, since children (e.g. `/admin/sandbox`) need not nest under the
 * parent landing path (`/admin/devtools`).
 */
export function adminItemHrefs(item: AdminNavItem): string[] {
  return [item.href, ...(item.children?.map((c) => c.href) ?? [])];
}
