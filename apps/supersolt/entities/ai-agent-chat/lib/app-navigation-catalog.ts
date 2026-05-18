export const APP_NAVIGATION_DESTINATION_KEYS = [
  "dashboard",
  "insights",
  "insights_sales",
  "insights_labour",
  "insights_inventory",
  "insights_p_and_l",
  "catalog",
  "catalog_items",
  "catalog_menu",
  "ingredients",
  "inventory",
  "inventory_overview",
  "inventory_order_guide",
  "inventory_purchase_orders",
  "inventory_invoices",
  "inventory_stock_counts",
  "inventory_waste",
  "inventory_suppliers",
  "workforce",
  "workforce_people",
  "workforce_roster",
  "workforce_availability",
  "workforce_leave",
  "workforce_timesheets",
  "workforce_payroll_export",
  "operations",
  "operations_daybook",
  "settings",
  "settings_permissions",
  "settings_organisation",
  "settings_venue",
  "settings_integrations",
] as const;

export type AppNavigationDestinationKey =
  (typeof APP_NAVIGATION_DESTINATION_KEYS)[number];

export type AppNavigationCatalogEntry = {
  key: AppNavigationDestinationKey;
  title: string;
  description?: string;
  /** Path after `/{organisationSlug}/{venueSlug}` — leading slash, no org/venue placeholders. */
  pathSuffix: string;
  /**
   * When set, navigation cards use this root-relative href instead of
   * `/{organisationSlug}/{venueSlug}{pathSuffix}` (access is still checked against the given org/venue).
   */
  globalHref?: string;
};

export const APP_NAVIGATION_CATALOG: Record<
  AppNavigationDestinationKey,
  AppNavigationCatalogEntry
> = {
  dashboard: {
    key: "dashboard",
    title: "Dashboard",
    description: "Workspace home with KPIs and venue overview.",
    pathSuffix: "",
    globalHref: "/dashboard",
  },
  insights: {
    key: "insights",
    title: "Insights",
    description: "Venue insights overview.",
    pathSuffix: "/insights",
  },
  insights_sales: {
    key: "insights_sales",
    title: "Sales",
    description: "Sales insights for this venue.",
    pathSuffix: "/insights/sales",
  },
  insights_labour: {
    key: "insights_labour",
    title: "Labour",
    description: "Labour insights for this venue.",
    pathSuffix: "/insights/labour",
  },
  insights_inventory: {
    key: "insights_inventory",
    title: "Inventory (insights)",
    description: "Inventory metrics in Insights.",
    pathSuffix: "/insights/inventory",
  },
  insights_p_and_l: {
    key: "insights_p_and_l",
    title: "P&L",
    description: "Profit and loss insights.",
    pathSuffix: "/insights/p-and-l",
  },
  catalog: {
    key: "catalog",
    title: "Catalog",
    description: "Catalog overview (items, menu, ingredients).",
    pathSuffix: "/catalog",
  },
  catalog_items: {
    key: "catalog_items",
    title: "Items",
    description: "Catalog items.",
    pathSuffix: "/catalog/items",
  },
  catalog_menu: {
    key: "catalog_menu",
    title: "Menu",
    description: "Menu builder and items.",
    pathSuffix: "/catalog/menu",
  },
  ingredients: {
    key: "ingredients",
    title: "Ingredients",
    description: "View and manage ingredients for this venue.",
    pathSuffix: "/catalog/ingredients",
  },
  inventory: {
    key: "inventory",
    title: "Inventory",
    description: "Inventory module overview.",
    pathSuffix: "/inventory",
  },
  inventory_overview: {
    key: "inventory_overview",
    title: "Inventory overview",
    description: "Stock and inventory overview.",
    pathSuffix: "/inventory/overview",
  },
  inventory_order_guide: {
    key: "inventory_order_guide",
    title: "Order guide",
    description: "Order guide for purchasing.",
    pathSuffix: "/inventory/order-guide",
  },
  inventory_purchase_orders: {
    key: "inventory_purchase_orders",
    title: "Purchase orders",
    pathSuffix: "/inventory/purchase-orders",
  },
  inventory_invoices: {
    key: "inventory_invoices",
    title: "Invoices",
    pathSuffix: "/inventory/invoices",
  },
  inventory_stock_counts: {
    key: "inventory_stock_counts",
    title: "Stock counts",
    pathSuffix: "/inventory/stock-counts",
  },
  inventory_waste: {
    key: "inventory_waste",
    title: "Waste",
    pathSuffix: "/inventory/waste",
  },
  inventory_suppliers: {
    key: "inventory_suppliers",
    title: "Suppliers",
    pathSuffix: "/inventory/suppliers",
  },
  workforce: {
    key: "workforce",
    title: "Workforce",
    description: "People, roster, and timesheets.",
    pathSuffix: "/workforce",
  },
  workforce_people: {
    key: "workforce_people",
    title: "People",
    pathSuffix: "/workforce/people",
  },
  workforce_roster: {
    key: "workforce_roster",
    title: "Roster",
    pathSuffix: "/workforce/roster",
  },
  workforce_availability: {
    key: "workforce_availability",
    title: "Availability",
    pathSuffix: "/workforce/availability",
  },
  workforce_leave: {
    key: "workforce_leave",
    title: "Leave",
    pathSuffix: "/workforce/leave",
  },
  workforce_timesheets: {
    key: "workforce_timesheets",
    title: "Timesheets",
    pathSuffix: "/workforce/timesheets",
  },
  workforce_payroll_export: {
    key: "workforce_payroll_export",
    title: "Payroll export",
    pathSuffix: "/workforce/payroll-export",
  },
  operations: {
    key: "operations",
    title: "Operations",
    description: "Day-to-day operations.",
    pathSuffix: "/operations",
  },
  operations_daybook: {
    key: "operations_daybook",
    title: "Daybook",
    pathSuffix: "/operations/daybook",
  },
  settings: {
    key: "settings",
    title: "Settings",
    description: "Venue and organisation settings.",
    pathSuffix: "/settings",
  },
  settings_permissions: {
    key: "settings_permissions",
    title: "Permissions",
    pathSuffix: "/settings/permissions",
  },
  settings_organisation: {
    key: "settings_organisation",
    title: "Organisation settings",
    pathSuffix: "/settings/organisation",
  },
  settings_venue: {
    key: "settings_venue",
    title: "Venue settings",
    pathSuffix: "/settings/venue",
  },
  settings_integrations: {
    key: "settings_integrations",
    title: "Integrations",
    pathSuffix: "/settings/integrations",
  },
};

export function isAppNavigationDestinationKey(
  value: string,
): value is AppNavigationDestinationKey {
  return (APP_NAVIGATION_DESTINATION_KEYS as readonly string[]).includes(value);
}
