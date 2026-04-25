export type SquareEnvironment = "sandbox" | "production";

const SANDBOX_BASE = "https://connect.squareupsandbox.com";
const PRODUCTION_BASE = "https://connect.squareup.com";

export function getSquareBaseUrl(environment: SquareEnvironment): string {
  return environment === "sandbox" ? SANDBOX_BASE : PRODUCTION_BASE;
}

export function parseSquareEnvironment(value: string | undefined): SquareEnvironment {
  const v = value?.trim().toLowerCase();
  if (v === "production") return "production";
  return "sandbox";
}

export type SquareOAuthEnvConfig = {
  environment: SquareEnvironment;
  applicationId: string;
  applicationSecret: string;
  redirectUri: string;
  baseUrl: string;
};

export function getSquareOAuthEnvConfig(): SquareOAuthEnvConfig {
  const environment = parseSquareEnvironment(process.env.SQUARE_ENVIRONMENT);
  const applicationId = process.env.SQUARE_APPLICATION_ID?.trim() ?? "";
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET?.trim() ?? "";
  const redirectUri = process.env.SQUARE_OAUTH_REDIRECT_URI?.trim() ?? "";

  if (!applicationId || !applicationSecret || !redirectUri) {
    throw new Error(
      "Square OAuth is not configured: set SQUARE_APPLICATION_ID, SQUARE_APPLICATION_SECRET, and SQUARE_OAUTH_REDIRECT_URI"
    );
  }

  return {
    environment,
    applicationId,
    applicationSecret,
    redirectUri,
    baseUrl: getSquareBaseUrl(environment),
  };
}

/** Prefer SQUARE_OAUTH_STATE_SECRET; falls back to application secret for local dev. */
export function getSquareOAuthStateSecret(): string {
  const dedicated = process.env.SQUARE_OAUTH_STATE_SECRET?.trim();
  if (dedicated) return dedicated;
  return process.env.SQUARE_APPLICATION_SECRET?.trim() ?? "";
}

/**
 * Every `*_READ` value from Square’s OAuthPermission enum (read-only; no writes).
 * Covers catalog, orders, payments, invoices, customers, inventory, loyalty, gift cards,
 * appointments, labor/timecards, cash drawer, disputes, subscriptions, bank/settlements/payouts,
 * online store, devices, vendors (beta), etc.
 *
 * If `authorize` returns invalid_scope, set `SQUARE_OAUTH_SCOPES` to a subset (often beta scopes
 * `VENDOR_READ`, `PAYOUTS_READ`, `DEVICES_READ` are the first to drop). Re-authorize after edits.
 *
 * @see https://developer.squareup.com/reference/square/enums/OAuthPermission
 */
const DEFAULT_SQUARE_OAUTH_READ_SCOPES = [
  "APPOINTMENTS_ALL_READ",
  "APPOINTMENTS_BUSINESS_SETTINGS_READ",
  "APPOINTMENTS_READ",
  "BANK_ACCOUNTS_READ",
  "CASH_DRAWER_READ",
  "CUSTOMERS_READ",
  "DEVICES_READ",
  "DISPUTES_READ",
  "EMPLOYEES_READ",
  "GIFTCARDS_READ",
  "INVENTORY_READ",
  "INVOICES_READ",
  "ITEMS_READ",
  "LOYALTY_READ",
  "MERCHANT_PROFILE_READ",
  "ONLINE_STORE_SITE_READ",
  "ONLINE_STORE_SNIPPETS_READ",
  "ORDERS_READ",
  "PAYMENTS_READ",
  "PAYOUTS_READ",
  "SETTLEMENTS_READ",
  "SUBSCRIPTIONS_READ",
  "TIMECARDS_READ",
  "TIMECARDS_SETTINGS_READ",
  "VENDOR_READ",
] as const;

export function getSquareOAuthScopes(): string {
  const raw = process.env.SQUARE_OAUTH_SCOPES?.trim();
  if (raw) return raw;
  return DEFAULT_SQUARE_OAUTH_READ_SCOPES.join(" ");
}

export function getOptionalSquareLocationIdFromEnv(): string | null {
  const v = process.env.SQUARE_LOCATION_ID?.trim();
  return v ? v : null;
}
