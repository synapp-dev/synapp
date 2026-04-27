import {
  School,
  Users,
  GraduationCap,
  Presentation,
  BarChart3,
  FileText,
  HelpCircle,
  BookOpenText,
  Settings,
  type LucideIcon,
  Component,
  Ticket,
  TicketCheck,
  DatabaseZap,
  FolderOpen,
} from "lucide-react";

export interface AdminItem {
  title: string;
  url: string;
  icon: LucideIcon;
  iconName: string; // String identifier for passing to client components
  description: string;
  /** Feature key for access control (e.g. admin_content). Used with useFeaturesAccess. */
  featureKey: string;
  enabled?: boolean; // false = hidden from config, true/undefined = visible
  disabled?: boolean; // true = visible but disabled (e.g. under development)
}

/**
 * Single source of truth for admin navigation items.
 * Items with `enabled: false` will be filtered out from navigation.
 */
export const adminItemsConfig: AdminItem[] = [
  {
    title: "Content",
    url: "/admin/content",
    icon: BookOpenText,
    iconName: "BookOpenText",
    description: "Manage curriculum content and resources",
    featureKey: "/admin/content",
    enabled: true,
  },
  {
    title: "Schools",
    url: "/admin/schools",
    icon: School,
    iconName: "School",
    description: "View and manage school accounts",
    featureKey: "/admin/schools",
    enabled: true,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    iconName: "Users",
    description: "Manage user accounts and permissions",
    featureKey: "/admin/users",
    enabled: true,
  },
  {
    title: "Features",
    url: "/admin/features",
    icon: Component,
    iconName: "Component",
    description: "Manage feature access control and permissions",
    featureKey: "/admin/features",
    enabled: true,
  },
  {
    title: "Resources",
    url: "/admin/resources",
    icon: FolderOpen,
    iconName: "FolderOpen",
    description: "Manage folder-based resource documents",
    featureKey: "/admin/resources",
    enabled: true,
  },
  {
    title: "Classes",
    url: "/admin/classes",
    icon: GraduationCap,
    iconName: "GraduationCap",
    description: "View and manage class rosters",
    featureKey: "/admin/classes",
    enabled: false,
  },
  {
    title: "Lessons",
    url: "/admin/lessons",
    icon: Presentation,
    iconName: "Presentation",
    description: "Monitor and manage lesson delivery",
    featureKey: "/admin/lessons",
    enabled: false,
  },
  {
    title: "Reports",
    url: "/admin/reports",
    icon: FileText,
    iconName: "FileText",
    description: "View platform reporting dashboards",
    featureKey: "/admin/reports",
    enabled: true,
  },
  {
    title: "Ratings",
    url: "/admin/ratings",
    icon: BarChart3,
    iconName: "BarChart3",
    description: "View teacher lesson ratings by curriculum stage",
    featureKey: "/admin/ratings",
    enabled: true,
  },
  {
    title: "Culture Ratings",
    url: "/admin/culture-ratings",
    icon: BarChart3,
    iconName: "BarChart3",
    description: "View culture rating analytics and reports",
    featureKey: "/admin/culture-ratings",
    enabled: true,
  },
  {
    title: "Audit Logs",
    url: "/admin/audit-logs",
    icon: FileText,
    iconName: "FileText",
    description: "Review system activity and changes",
    featureKey: "/admin/audit-logs",
    enabled: true,
  },
  {
    title: "Support Tools",
    url: "/admin/support-tools",
    icon: HelpCircle,
    iconName: "HelpCircle",
    description: "Access support and troubleshooting tools",
    featureKey: "/admin/support-tools",
    enabled: true,
  },
  {
    title: "Tickets",
    url: "/admin/tickets",
    icon: TicketCheck,
    iconName: "TicketCheck",
    description: "View and manage user feedback tickets",
    featureKey: "/admin/tickets",
    enabled: true,
  },
  {
    title: "Migrations",
    url: "/admin/migrations",
    icon: DatabaseZap,
    iconName: "DatabaseZap",
    description: "Run one-off database migrations",
    featureKey: "/admin/migrations",
    enabled: true,
  },
];

/**
 * Map URL segment (first path segment under /admin) to feature key for route guarding.
 * Used by AdminRouteGuard to protect sub-routes.
 */
export const adminSegmentToFeatureKey: Record<string, string> = {
  content: "/admin/content",
  schools: "/admin/schools",
  users: "/admin/users",
  features: "/admin/features",
  classes: "/admin/classes",
  lessons: "/admin/lessons",
  ratings: "/admin/ratings",
  reports: "/admin/reports",
  "culture-ratings": "/admin/culture-ratings",
  "audit-logs": "/admin/audit-logs",
  "support-tools": "/admin/support-tools",
  tickets: "/admin/tickets",
  resources: "/admin/resources",
  migrations: "/admin/migrations",
};

/**
 * Get only enabled admin items
 */
export function getEnabledAdminItems(): AdminItem[] {
  return adminItemsConfig.filter((item) => item.enabled !== false);
}

/**
 * Get admin items grouped by category for the tab switcher
 * This maintains the existing category structure while using the shared config
 */
export function getAdminItemsByCategory() {
  const enabledItems = getEnabledAdminItems();

  // Map items to their categories
  const categoryMap: Record<string, AdminItem[]> = {
    Content: [],
    Clients: [],
    Lessons: [],
    Reporting: [],
    "System Settings": [],
    "Support Tools": [],
  };

  enabledItems.forEach((item) => {
    if (item.title === "Content") {
      categoryMap["Content"].push(item);
    } else if (item.title === "Resources") {
      categoryMap["Content"].push(item);
    } else if (
      item.title === "Schools" ||
      item.title === "Users" ||
      item.title === "Classes"
    ) {
      categoryMap["Clients"].push(item);
    } else if (item.title === "Lessons") {
      categoryMap["Lessons"].push(item);
    } else if (
      item.title === "Reports" ||
      item.title === "Ratings" ||
      item.title === "Culture Ratings"
    ) {
      categoryMap["Reporting"].push(item);
    } else if (item.title === "Audit Logs") {
      categoryMap["System Settings"].push(item);
    } else if (item.title === "Support Tools") {
      categoryMap["Support Tools"].push(item);
    } else if (item.title === "Tickets") {
      categoryMap["Support Tools"].push(item);
    } else if (item.title === "Migrations") {
      categoryMap["System Settings"].push(item);
    }
  });

  // Convert to array format and filter out empty categories
  return Object.entries(categoryMap)
    .filter(([_, items]) => items.length > 0)
    .map(([name, items]) => ({
      name,
      items: items.map(({ title, url, icon, iconName, disabled }) => ({
        title,
        url,
        icon,
        iconName,
        disabled,
      })),
    }));
}
