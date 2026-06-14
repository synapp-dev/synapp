import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  exchangeCodeForTokens,
  expiresAtIso,
  listTenants,
} from "@/lib/xero/client";

function accountsRedirect(request: NextRequest, error?: string) {
  const url = new URL("/finance/accounts", request.url);
  if (error) url.searchParams.set("xero_error", error);
  const response = NextResponse.redirect(url);
  response.cookies.delete("xero_oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const stateCookie = request.cookies.get("xero_oauth_state")?.value;

  if (params.get("error")) return accountsRedirect(request, "denied");
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return accountsRedirect(request, "state_mismatch");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const tenants = await listTenants(tokens.access_token);
    if (tenants.length === 0) return accountsRedirect(request, "no_tenant");
    const tenant = tenants[0]!;

    const admin = createAdminClient();
    const { error } = await admin.from("xero_connections").upsert(
      {
        user_id: user.id,
        xero_tenant_id: tenant.tenantId,
        xero_tenant_name: tenant.tenantName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAtIso(tokens.expires_in),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw new Error(error.message);

    return accountsRedirect(request);
  } catch (err) {
    console.warn(
      "[xero-callback] connection failed:",
      err instanceof Error ? err.message : err
    );
    return accountsRedirect(request, "exchange_failed");
  }
}
