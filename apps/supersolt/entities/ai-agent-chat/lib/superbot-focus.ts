import {
  APP_NAVIGATION_CATALOG,
  type AppNavigationDestinationKey,
} from "@/entities/ai-agent-chat/lib/app-navigation-catalog";

/**
 * Superbot "focus intents": the concrete actions the digest can send an
 * operator to. Each intent resolves to a destination page (via the navigation
 * catalog), the control that page should light up on arrival, and the guidance
 * banner shown there. The digest emits the `slug` in an action marker
 * (`- @slug text`); the action card deep-links with `?superbot=<slug>`, and the
 * destination reads it back to prime the page.
 *
 * Adding a new actionable digest suggestion = one entry here + a
 * `useSuperbotFocusTarget(targetId)` on the destination's control.
 */
export type SuperbotFocusIntent = {
  slug: string;
  /** Page the action lives on (path resolved from the navigation catalog). */
  destination: AppNavigationDestinationKey;
  /** Id shared with `useSuperbotFocusTarget` on the destination's control. */
  targetId: string;
  /** Short heading for the "sent you here" banner. */
  bannerTitle: string;
  /** One-line guidance shown in the banner and used as the card's fallback text. */
  guidance: string;
  /** Label for the reinforced call-to-action, when the page shows one. */
  cta: string;
};

export const SUPERBOT_FOCUS_QUERY_PARAM = "superbot";

/**
 * Query-string flag routes carry so a HARD load (which strips other params,
 * see the scoped-route note) can still tell it arrived from a Superbot action.
 */
export const SUPERBOT_FOCUS_INTENTS = {
  "map-unmapped-sales": {
    slug: "map-unmapped-sales",
    destination: "catalog_items",
    targetId: "superbot-map-sales",
    bannerTitle: "Superbot sent you here",
    guidance:
      "Map these POS items to recipes so their sales deplete stock and sharpen COGS.",
    cta: "Map items to recipes",
  },
  "start-stock-count": {
    slug: "start-stock-count",
    destination: "inventory_stock_counts",
    targetId: "superbot-start-count",
    bannerTitle: "Superbot sent you here",
    guidance:
      "Run a stock count to anchor stock-on-hand so cover and variance go live.",
    cta: "Start a count",
  },
  "build-order": {
    slug: "build-order",
    destination: "inventory_order_guide",
    targetId: "superbot-build-order",
    bannerTitle: "Superbot sent you here",
    guidance:
      "Build a purchase order from the consumption-driven order guide before you run short.",
    cta: "Build an order",
  },
  "reconcile-invoices": {
    slug: "reconcile-invoices",
    destination: "inventory_invoices",
    targetId: "superbot-invoices",
    bannerTitle: "Superbot sent you here",
    guidance: "Reconcile the invoices waiting so costs and stock stay accurate.",
    cta: "Review pending invoices",
  },
  "log-waste": {
    slug: "log-waste",
    destination: "inventory_waste",
    targetId: "superbot-log-waste",
    bannerTitle: "Superbot sent you here",
    guidance: "Log waste so shrinkage is tracked and stock-on-hand stays honest.",
    cta: "Log waste",
  },
  "chase-supplier": {
    slug: "chase-supplier",
    destination: "inventory_suppliers",
    targetId: "superbot-suppliers",
    bannerTitle: "Superbot sent you here",
    guidance: "Chase the supplier or delivery holding up your order.",
    cta: "Open suppliers",
  },
  "reconnect-square": {
    slug: "reconnect-square",
    destination: "settings_integrations",
    targetId: "superbot-square-connection",
    bannerTitle: "Superbot sent you here",
    guidance:
      "Reconnect Square so sales, forecasts and consumption keep syncing.",
    cta: "Fix the Square connection",
  },
} as const satisfies Record<string, SuperbotFocusIntent>;

export type SuperbotFocusSlug = keyof typeof SUPERBOT_FOCUS_INTENTS;

export function isSuperbotFocusSlug(value: string): value is SuperbotFocusSlug {
  return Object.prototype.hasOwnProperty.call(SUPERBOT_FOCUS_INTENTS, value);
}

export function getSuperbotFocusIntent(
  value: string | null | undefined,
): SuperbotFocusIntent | null {
  if (!value || !isSuperbotFocusSlug(value)) return null;
  return SUPERBOT_FOCUS_INTENTS[value];
}

/**
 * Root-relative deep link for an action card: the destination path for the
 * given org/venue, tagged with the focus slug so the page primes on arrival.
 */
export function buildSuperbotActionHref(
  organisationSlug: string,
  venueSlug: string,
  slug: SuperbotFocusSlug,
): string {
  const entry = APP_NAVIGATION_CATALOG[SUPERBOT_FOCUS_INTENTS[slug].destination];
  return `/${organisationSlug}/${venueSlug}${entry.pathSuffix}?${SUPERBOT_FOCUS_QUERY_PARAM}=${slug}`;
}

/** The destination catalog entry (title, path) an intent points at. */
export function superbotFocusDestinationEntry(slug: SuperbotFocusSlug) {
  return APP_NAVIGATION_CATALOG[SUPERBOT_FOCUS_INTENTS[slug].destination];
}
