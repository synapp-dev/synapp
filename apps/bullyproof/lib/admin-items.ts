import {
  Building2,
  Users,
  GraduationCap,
  Presentation,
  BarChart3,
  FileText,
  HelpCircle,
  BookOpenText,
  type LucideIcon,
} from "lucide-react";

export interface AdminItem {
  title: string;
  url: string;
  icon: LucideIcon;
  iconName: string; // String identifier for passing to client components
  description: string;
  enabled?: boolean; // false = hidden, true/undefined = visible
  disabled?: boolean; // true = visible but disabled (grayed out, non-clickable)
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
    enabled: true,
  },
  {
    title: "Schools",
    url: "/admin/schools",
    icon: Building2,
    iconName: "Building2",
    description: "View and manage school accounts",
    enabled: true,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    iconName: "Users",
    description: "Manage user accounts and permissions",
    enabled: true,
  },
  {
    title: "Classes",
    url: "/admin/classes",
    icon: GraduationCap,
    iconName: "GraduationCap",
    description: "View and manage class rosters",
    enabled: false,
  },
  {
    title: "Lessons",
    url: "/admin/lessons",
    icon: Presentation,
    iconName: "Presentation",
    description: "Monitor and manage lesson delivery",
    enabled: false,
  },
  {
    title: "Culture Ratings",
    url: "/admin/culture-ratings",
    icon: BarChart3,
    iconName: "BarChart3",
    description: "View culture rating analytics and reports",
    enabled: true,
    disabled: true,
  },
  {
    title: "Audit Logs",
    url: "/admin/audit-logs",
    icon: FileText,
    iconName: "FileText",
    description: "Review system activity and changes",
    enabled: true,
    disabled: true,
  },
  {
    title: "Support Tools",
    url: "/admin/support-tools",
    icon: HelpCircle,
    iconName: "HelpCircle",
    description: "Access support and troubleshooting tools",
    enabled: true,
    disabled: true,
  },
];

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
    } else if (
      item.title === "Schools" ||
      item.title === "Users" ||
      item.title === "Classes"
    ) {
      categoryMap["Clients"].push(item);
    } else if (item.title === "Lessons") {
      categoryMap["Lessons"].push(item);
    } else if (item.title === "Culture Ratings") {
      categoryMap["Reporting"].push(item);
    } else if (item.title === "Audit Logs") {
      categoryMap["System Settings"].push(item);
    } else if (item.title === "Support Tools") {
      categoryMap["Support Tools"].push(item);
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
