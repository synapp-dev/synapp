export type XeroOAuthEnvConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getXeroOAuthEnvConfig(): XeroOAuthEnvConfig & { isConfigured: boolean } {
  const clientId = process.env.XERO_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.XERO_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = process.env.XERO_OAUTH_REDIRECT_URI?.trim() ?? "";
  return {
    isConfigured: Boolean(clientId && clientSecret && redirectUri),
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function requireXeroOAuthEnvConfig(): XeroOAuthEnvConfig {
  const cfg = getXeroOAuthEnvConfig();
  if (!cfg.isConfigured) {
    throw new Error(
      "Xero OAuth is not configured: set XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_OAUTH_REDIRECT_URI",
    );
  }
  return cfg;
}

/** Prefer XERO_OAUTH_STATE_SECRET; falls back to client secret for local dev. */
export function getXeroOAuthStateSecret(): string {
  const dedicated = process.env.XERO_OAUTH_STATE_SECRET?.trim();
  if (dedicated) return dedicated;
  return process.env.XERO_CLIENT_SECRET?.trim() ?? "";
}

/**
 * Xero OAuth scopes for supplier-invoice ingestion (must match developer.xero.com → Configuration).
 *
 * Product flow:
 * 1. Sync ACCPAY (supplier) bills from Xero
 * 2. Download invoice PDFs / attachments for parsing
 * 3. Extract line items + supplier identity → create Supersolt suppliers & ingredients
 *
 * @see https://developer.xero.com/documentation/api/accounting/invoices
 * @see https://developer.xero.com/documentation/api/accounting/attachments
 * @see https://developer.xero.com/documentation/api/accounting/contacts
 */
export const XERO_OAUTH_SCOPES = [
  "offline_access",
  // Do not add app.connections here — that scope is for client-credentials connection
  // management, not the user authorisation URL (causes "Requested wrong apps scopes").
  // List/sync supplier bills (ACCPAY) and fetch structured line items from the API
  "accounting.invoices",
  // List and download invoice PDFs and other attachments (GET /Invoices/{id}/Attachments/…)
  "accounting.attachments",
  // Supplier name, Xero contact ID, and full contact records for supplier matching/creation
  "accounting.contacts",
  // Items / chart-of-accounts context when mapping parsed line items to ingredients.
  // NOTE: this scope (with accounting.invoices) already grants read access to Xero
  // Items AND Purchase Orders — verified GET /Items + GET /PurchaseOrders both 200.
  // The PO import needs NO additional scope. Do NOT add accounting.purchaseorders.* or
  // accounting.transactions.* here — those exact strings aren't enabled on this app
  // and return invalid_scope at the OAuth consent step.
  "accounting.settings",
] as const;

export function getXeroOAuthScopes(): string {
  return XERO_OAUTH_SCOPES.join(" ");
}
