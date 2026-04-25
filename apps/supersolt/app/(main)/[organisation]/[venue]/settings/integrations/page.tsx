import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@workspace/ui/components/button";
import { createServerClient } from "@/utils/supabase/server";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { getVenueSquareConnectionSummary } from "@/server/sales/sales-insights.service";
import { userIsOrgAdmin } from "@/server/square/assert-org-admin";
import { SquareCatalogLinksCard } from "../_components/square-catalog-links-card";

/** Origin for absolute links on this request (localhost vs 127.0.0.1 comes from how you opened the page). */
async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const rawProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    rawProto ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function firstParam(
  value: string | string[] | undefined
): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function readSquareOauthSetup(): {
  isConfigured: boolean;
  redirectUri: string;
  applicationId: string;
} {
  const applicationId = process.env.SQUARE_APPLICATION_ID?.trim() ?? "";
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET?.trim() ?? "";
  const redirectUri = process.env.SQUARE_OAUTH_REDIRECT_URI?.trim() ?? "";
  return {
    isConfigured: Boolean(applicationId && applicationSecret && redirectUri),
    redirectUri,
    applicationId,
  };
}

function squareErrorHint(code: string): string | null {
  const hints: Record<string, string> = {
    forbidden: "Your account needs org-admin access for this organisation.",
    config: "Set SQUARE_APPLICATION_ID, SQUARE_APPLICATION_SECRET, and SQUARE_OAUTH_REDIRECT_URI in .env.local (see square.env.example). Restart the dev server after editing.",
    venue_not_found: "This venue slug may be wrong or the venue is inactive.",
    token_exchange:
      "Square rejected the code. Most often the redirect URL in the Developer Console does not exactly match SQUARE_OAUTH_REDIRECT_URI (including http vs https, port, path, and trailing slash).",
    session: "You were signed out before Square sent you back. Stay logged into this app, then try Connect again.",
    wrong_user: "You completed Square as a different user than the one that started Connect. Use one browser profile and one Supersolt account.",
    missing_code: "Square did not return an authorization code. If you saw an error on Square’s page, fix that first (sandbox: open the seller test dashboard from the Developer Console).",
    save_failed: "Could not save tokens to the database. Check that the venue_square_connections migration is applied and you are still an org admin.",
    state_missing_cookie_or_state:
      "The secure cookie from step 1 was missing on return. Use the same host you started on (if your redirect uses localhost, browse this app as http://localhost:… not http://127.0.0.1:…), avoid blocking cookies, and complete the flow within a few minutes.",
    state_expired: "The Connect link expired. Click Connect Square again.",
    state_bad_signature: "OAuth state could not be verified. Restart the dev server and try again; if you set SQUARE_OAUTH_STATE_SECRET, don’t change it mid-flow.",
    state_nonce_mismatch: "Square returned a different state than we sent. Click Connect Square again from this page (don’t bookmark the Square URL).",
  };
  if (hints[code]) return hints[code];
  if (code.startsWith("state_")) {
    return "Return from Square could not be validated. Click Connect Square again; use the same hostname as in your redirect URL (localhost vs 127.0.0.1) and don’t wait too long.";
  }
  return null;
}

export default async function SettingsIntegrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organisation: string; venue: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organisation, venue } = await params;
  const sp = await searchParams;

  const square = firstParam(sp.square);
  const squareError = firstParam(sp.square_error);
  const squareErrorDetail = firstParam(sp.square_error_detail);

  const connectQuery = new URLSearchParams({
    organisation,
    venue,
    next: `/${organisation}/${venue}/settings/integrations`,
  });
  const connectHref = `/api/square/oauth/authorize?${connectQuery.toString()}`;
  const requestOrigin = await getRequestOrigin();
  const absoluteConnectUrl = requestOrigin ? `${requestOrigin}${connectHref}` : "";

  const squareSandbox =
    (process.env.SQUARE_ENVIRONMENT ?? "sandbox").trim().toLowerCase() !== "production";

  const squareOauth = readSquareOauthSetup();
  const errorHint = squareError ? squareErrorHint(squareError) : null;

  const supabase = await createServerClient();
  const {
    data: { user: settingsUser },
  } = await supabase.auth.getUser();
  const admin = createSupabaseAdmin();
  const squareSummary = settingsUser
    ? await getVenueSquareConnectionSummary(supabase, admin, {
        userId: settingsUser.id,
        organisationSlug: organisation,
        venueSlug: venue,
      })
    : {
        connected: false,
        merchantId: null,
        environment: null,
        updatedAt: null,
      };

  let canManageSquareCatalogLinks = false;
  if (settingsUser) {
    const ctx = await ingredientsRepo.getVenueContextBySlugs(supabase, organisation, venue);
    if (ctx) {
      canManageSquareCatalogLinks = await userIsOrgAdmin(
        supabase,
        settingsUser.id,
        ctx.organisationId
      );
    }
  }

  return (
    <section className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Organisation: <span className="font-medium">{organisation}</span> · Venue:{" "}
        <span className="font-medium">{venue}</span>
      </p>

      {square === "connected" || squareSummary.connected ? (
        <div className="max-w-xl rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/35">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            Square is connected for this venue
          </p>
          {squareSummary.merchantId ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Merchant{" "}
              <code className="rounded bg-background/80 px-1 py-0.5 text-xs">
                {squareSummary.merchantId}
              </code>
              {squareSummary.environment ? <> · {squareSummary.environment}</> : null}
              {squareSummary.updatedAt ? (
                <> · last updated {new Date(squareSummary.updatedAt).toLocaleString()}</>
              ) : null}
            </p>
          ) : squareSummary.connected ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Connected (merchant id not visible with your current login — org admins see full
              details).
            </p>
          ) : null}
          <p className="text-muted-foreground mt-2 text-xs">
            View payments in{" "}
            <Link
              href={`/${organisation}/${venue}/insights/sales`}
              className="font-medium text-primary underline underline-offset-2"
            >
              Sales insights
            </Link>
            . Include the date of your test payment in the range (e.g. Last 30 days).
          </p>
        </div>
      ) : null}

      {squareError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          <p className="font-medium text-destructive">Square connection failed</p>
          {squareErrorDetail ? (
            <p className="text-muted-foreground mt-1">{squareErrorDetail}</p>
          ) : (
            <p className="text-muted-foreground mt-1">Code: {squareError}</p>
          )}
          {errorHint ? (
            <p className="text-muted-foreground mt-2 border-t border-destructive/20 pt-2">
              {errorHint}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Square POS</h2>
        <p className="text-muted-foreground max-w-xl text-sm">
          Connect your Square seller account (org admins only). You will be redirected to Square to
          approve access, then returned here.
        </p>

        {!squareOauth.isConfigured ? (
          <div className="bg-destructive/5 max-w-xl rounded-md border border-destructive/30 px-3 py-2 text-sm">
            <p className="font-medium text-destructive">Square OAuth is not configured</p>
            <p className="text-muted-foreground mt-1">
              Add credentials from the Developer Console (Sandbox) → OAuth to{" "}
              <code className="text-xs">apps/supersolt/.env.local</code>. See{" "}
              <code className="text-xs">square.env.example</code> for variable names, then restart{" "}
              <code className="text-xs">pnpm dev</code>.
            </p>
          </div>
        ) : null}

        {squareOauth.isConfigured ? (
          <div className="bg-muted/50 max-w-xl rounded-md border px-3 py-2 text-sm space-y-2">
            <p className="font-medium">Use these in the Square Developer Console</p>
            <p className="text-muted-foreground">
              Application ID (Sandbox):{" "}
              <code className="break-all text-xs">{squareOauth.applicationId}</code>
            </p>
            <p className="text-muted-foreground">
              Redirect URL — paste into OAuth → Redirect URL (must match character-for-character):
            </p>
            <code className="bg-background block w-full overflow-x-auto rounded border px-2 py-1.5 text-xs">
              {squareOauth.redirectUri}
            </code>
          </div>
        ) : null}

        {squareSandbox ? (
          <div className="bg-muted/50 max-w-xl rounded-md border px-3 py-3 text-sm space-y-2">
            <p className="font-medium">Sandbox: do these in order</p>
            <ol className="text-muted-foreground list-decimal space-y-2 pl-4">
              <li>
                In{" "}
                <a
                  className="text-primary underline underline-offset-2"
                  href="https://developer.squareup.com/apps"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Developer Console
                </a>
                , open your app → <strong>Sandbox</strong> → <strong>OAuth</strong>. Set the
                redirect URL above and confirm.
              </li>
              <li>
                Still in Sandbox: <strong>Sandbox test accounts</strong> → pick a seller →{" "}
                <strong>Open in Square Dashboard</strong>. Keep that tab open and signed in. If you
                skip this, Square shows: “first launch the seller test account from the Developer
                Console.”
              </li>
              <li>
                Browse this app using the <strong>same hostname</strong> as in your redirect URL
                (e.g. if the redirect is <code className="text-xs">http://localhost:3005/...</code>,
                use <code className="text-xs">localhost</code>, not <code className="text-xs">127.0.0.1</code>
                ).
              </li>
              <li>
                Click <strong>Connect Square</strong> below (full page navigation, not a preview
                iframe).
              </li>
            </ol>
            <p className="text-muted-foreground text-xs pt-1">
              Authorize URLs use{" "}
              <code className="text-xs">connect.squareupsandbox.com</code>, not{" "}
              <code className="text-xs">squareupsandbox.com</code>.{" "}
              <a
                className="text-primary underline underline-offset-2"
                href="https://developer.squareup.com/docs/oauth-api/walkthrough"
                rel="noopener noreferrer"
                target="_blank"
              >
                OAuth walkthrough
              </a>
            </p>
          </div>
        ) : null}

        {squareSummary.connected ? (
          <SquareCatalogLinksCard
            organisation={organisation}
            venue={venue}
            canManage={canManageSquareCatalogLinks}
          />
        ) : null}

        {squareOauth.isConfigured ? (
          <Button asChild>
            <a href={connectHref}>Connect Square</a>
          </Button>
        ) : (
          <Button type="button" disabled>
            Connect Square (configure env first)
          </Button>
        )}

        {squareOauth.isConfigured ? (
          <div className="max-w-xl space-y-2 text-sm">
            <p className="font-medium">Connect URL</p>
            <p className="text-muted-foreground text-xs">
              Open or paste this in the <strong>same browser</strong> you’re logged into (incognito
              needs a separate login). It hits our API first (sets a short-lived cookie), then
              redirects to Square — so it’s not the same as copying a{" "}
              <code className="text-xs">connect.squareupsandbox.com</code> link from the address bar
              after redirect.
            </p>
            {absoluteConnectUrl ? (
              <code className="bg-muted/80 block w-full overflow-x-auto rounded border px-2 py-2 text-xs break-all">
                {absoluteConnectUrl}
              </code>
            ) : (
              <code className="bg-muted/80 block w-full overflow-x-auto rounded border px-2 py-2 text-xs break-all">
                {connectHref}
              </code>
            )}
            {!absoluteConnectUrl ? (
              <p className="text-muted-foreground text-xs">
                Prepend your site origin (e.g. <code className="text-xs">http://localhost:3005</code>
                ) if only the path is shown.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
