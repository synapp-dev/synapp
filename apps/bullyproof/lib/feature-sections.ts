import {
  PanelTop,
  PanelLeft,
  LayoutDashboard,
  ShieldCheck,
  House,
  Users,
  GraduationCap,
  Presentation,
  BookOpenText,
  LibraryBig,
  TrendingUp,
  FileText,
  Apple,
  BadgeCheck,
  HelpingHand,
  Settings,
  BookOpen,
  Cog,
  Info,
  type LucideIcon,
} from "lucide-react";

// ─── Section Group Definition ────────────────────────────────────────────────

export type SectionGroupKey = "platform" | "school" | "layout-system";

export interface SectionGroup {
  key: SectionGroupKey;
  label: string;
  description: string;
}

export const SECTION_GROUPS: SectionGroup[] = [
  {
    key: "platform",
    label: "Platform Pages",
    description: "Top-level platform pages and navigation destinations.",
  },
  {
    key: "school",
    label: "School Pages",
    description: "Pages scoped to an individual school.",
  },
  {
    key: "layout-system",
    label: "Layout & System",
    description: "Shared layout components and system-wide configuration.",
  },
];

// ─── Section Definition ──────────────────────────────────────────────────────

export interface FeatureSection {
  /** URL-safe slug stored in the DB `section` column */
  key: string;
  /** Human-readable label */
  label: string;
  /** Short description shown on the card */
  description: string;
  /** Icon component */
  icon: LucideIcon;
  /** Icon name string for serialization */
  iconName: string;
  /** Which group this section belongs to */
  group: SectionGroupKey;
  /** Whether this section has defined sub-sections */
  hasSubSections?: boolean;
}

export interface FeatureSubSection {
  key: string;
  label: string;
}

// ─── Sections ────────────────────────────────────────────────────────────────

export const FEATURE_SECTIONS: FeatureSection[] = [
  // ── Platform Pages ──────────────────────────────────────────────────────
  {
    key: "admin",
    label: "Admin",
    description:
      "Admin panel including content, schools, users, and more.",
    icon: ShieldCheck,
    iconName: "ShieldCheck",
    group: "platform",
    hasSubSections: true,
  },
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Dashboard page, widgets, and overview.",
    icon: LayoutDashboard,
    iconName: "LayoutDashboard",
    group: "platform",
  },
  {
    key: "courses",
    label: "Courses",
    description: "Courses browsing and enrollment.",
    icon: BookOpen,
    iconName: "BookOpen",
    group: "platform",
  },
  {
    key: "certification",
    label: "AP Certification",
    description: "Certification courses and quizzes.",
    icon: BadgeCheck,
    iconName: "BadgeCheck",
    group: "platform",
  },
  {
    key: "settings",
    label: "Settings",
    description: "User and platform settings.",
    icon: Cog,
    iconName: "Cog",
    group: "platform",
  },
  {
    key: "welcome",
    label: "Welcome",
    description: "Welcome and onboarding flow.",
    icon: Apple,
    iconName: "Apple",
    group: "platform",
  },
  {
    key: "support",
    label: "Support",
    description: "Support pages, FAQ, and help resources.",
    icon: HelpingHand,
    iconName: "HelpingHand",
    group: "platform",
  },
  {
    key: "about",
    label: "About",
    description: "About page and platform information.",
    icon: Info,
    iconName: "Info",
    group: "platform",
  },

  // ── School Pages ────────────────────────────────────────────────────────
  {
    key: "schools-home",
    label: "Schools / Home",
    description: "School home page and overview widgets.",
    icon: House,
    iconName: "House",
    group: "school",
  },
  {
    key: "schools-teachers",
    label: "Schools / Teachers",
    description: "Teacher management within a school.",
    icon: Users,
    iconName: "Users",
    group: "school",
  },
  {
    key: "schools-classes",
    label: "Schools / Classes",
    description: "Class management and rosters.",
    icon: GraduationCap,
    iconName: "GraduationCap",
    group: "school",
  },
  {
    key: "schools-lessons",
    label: "Schools / Lessons",
    description: "Lesson delivery and management.",
    icon: Presentation,
    iconName: "Presentation",
    group: "school",
  },
  {
    key: "schools-content",
    label: "Schools / Content",
    description: "Content browsing and stage-based material.",
    icon: BookOpenText,
    iconName: "BookOpenText",
    group: "school",
  },
  {
    key: "schools-resources",
    label: "Schools / Resources",
    description: "School resources, info packs, and videos.",
    icon: LibraryBig,
    iconName: "LibraryBig",
    group: "school",
  },
  {
    key: "schools-performance",
    label: "Schools / Performance",
    description: "Performance analytics and tracking.",
    icon: TrendingUp,
    iconName: "TrendingUp",
    group: "school",
  },
  {
    key: "schools-reports",
    label: "Schools / Reports",
    description: "Data reports and exports.",
    icon: FileText,
    iconName: "FileText",
    group: "school",
  },

  // ── Layout & System ─────────────────────────────────────────────────────
  {
    key: "header",
    label: "Header",
    description:
      "Site header, command menu, impersonate mode, and theme toggle.",
    icon: PanelTop,
    iconName: "PanelTop",
    group: "layout-system",
  },
  {
    key: "sidebar",
    label: "Sidebar",
    description: "Navigation links, school switcher, and sidebar layout.",
    icon: PanelLeft,
    iconName: "PanelLeft",
    group: "layout-system",
  },
  {
    key: "system",
    label: "System",
    description: "Maintenance mode, platform-wide configuration.",
    icon: Settings,
    iconName: "Settings",
    group: "layout-system",
  },
];

// ─── Sub-sections (for sections with nested areas) ───────────────────────────

export const SECTION_SUB_GROUPS: Record<string, FeatureSubSection[]> = {
  admin: [
    { key: "panel", label: "Admin Panel" },
    { key: "content", label: "Content" },
    { key: "schools", label: "Schools" },
    { key: "users", label: "Users" },
    { key: "features", label: "Features" },
    { key: "classes", label: "Classes" },
    { key: "lessons", label: "Lessons" },
    { key: "culture-ratings", label: "Culture Ratings" },
    { key: "audit-logs", label: "Audit Logs" },
    { key: "support-tools", label: "Support Tools" },
    { key: "tickets", label: "Tickets" },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Valid section slugs for URL validation */
export const VALID_SECTION_SLUGS = FEATURE_SECTIONS.map((s) => s.key);

/** Look up a section definition by slug */
export function getSectionByKey(key: string): FeatureSection | undefined {
  return FEATURE_SECTIONS.find((s) => s.key === key);
}

/** Get all sections belonging to a group */
export function getSectionsByGroup(group: SectionGroupKey): FeatureSection[] {
  return FEATURE_SECTIONS.filter((s) => s.group === group);
}

/**
 * Derive which admin sub-section a feature key belongs to.
 * e.g. "/admin/content" -> "content", "/admin" -> "panel"
 */
export function getAdminSubSection(featureKey: string): string {
  if (featureKey === "/admin") return "panel";
  // "/admin/content" -> "content", "/admin/culture-ratings" -> "culture-ratings"
  const match = featureKey.match(/^\/admin\/([a-z-]+)/);
  if (match) return match[1];
  // action keys like "admin:delete-user" -> derive from the portion after "admin:"
  const actionMatch = featureKey.match(/^admin:([a-z-]+)/);
  if (actionMatch) return actionMatch[1];
  // component keys like "/admin/users.edit-button" -> "users"
  const componentMatch = featureKey.match(/^\/admin\/([a-z-]+)\./);
  if (componentMatch) return componentMatch[1];
  return "other";
}
