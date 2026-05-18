export type SuperbotSuggestionIconId =
  | "users"
  | "calendar"
  | "clipboard-list"
  | "utensils";

export type SuperbotSuggestion = {
  id: string;
  /** Short label shown in the 1×6 picker (icon + title). */
  gridLabel: string;
  title: string;
  description: string;
  ctaLabel: string;
  /** Relative to `/{organisationSlug}/{venueSlug}/`. */
  pathSuffix: string;
  iconId: SuperbotSuggestionIconId;
  /** Shown on the destination page after navigating from this dashboard card. */
  pageFollowUpQuestion?: string;
};

export const dummySuperbotSuggestions: SuperbotSuggestion[] = [
  {
    id: "timesheets",
    gridLabel: "Employee Timesheets",
    title: "Complete employee timesheets",
    description:
      "Four submissions are still outstanding for this pay period. Closing them before Friday keeps payroll on track and avoids last-minute corrections.",
    ctaLabel: "Open timesheets",
    pathSuffix: "workforce/timesheets",
    iconId: "users",
    pageFollowUpQuestion:
      "There are still pending submissions in this view—would you like to review them now?",
  },
  {
    id: "roster",
    gridLabel: "Weekly Roster",
    title: "Create rosters for next week",
    description:
      "Next week’s cover still has open lunch slots on Tuesday and Wednesday. Publishing early helps your team swap shifts without same-day gaps.",
    ctaLabel: "Open roster",
    pathSuffix: "workforce/roster",
    iconId: "calendar",
    pageFollowUpQuestion:
      "Would you like help filling the open lunch slots before you publish?",
  },
  {
    id: "order-guide",
    gridLabel: "Order Guide",
    title: "Create order guide for next week",
    description:
      "Par levels for dairy and produce drifted after the long weekend. Refreshing the order guide now aligns incoming deliveries with projected covers.",
    ctaLabel: "Open order guide",
    pathSuffix: "inventory/order-guide",
    iconId: "clipboard-list",
    pageFollowUpQuestion:
      "Shall we walk through refreshing par levels for the categories called out on the dashboard?",
  },
  {
    id: "menu",
    gridLabel: "Menu Offerings",
    title: "Adjust menu offerings",
    description:
      "Paninis have outperformed wraps by 18% over the last quarter. Consider adding a second panini line or rotating a wrap into specials to balance margin and demand.",
    ctaLabel: "Review menu items",
    pathSuffix: "menu/menu-items",
    iconId: "utensils",
    pageFollowUpQuestion:
      "Want to compare top movers here against what the dashboard highlighted?",
  },
];
