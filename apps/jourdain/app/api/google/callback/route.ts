import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createOAuthClient, getGoogleConnection } from "@/lib/google/client";

function calendarRedirect(request: NextRequest, error?: string) {
  const url = new URL("/calendar", request.url);
  if (error) url.searchParams.set("google_error", error);
  const response = NextResponse.redirect(url);
  response.cookies.delete("google_oauth_state");
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
  const stateCookie = request.cookies.get("google_oauth_state")?.value;

  if (params.get("error")) return calendarRedirect(request, "denied");
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return calendarRedirect(request, "state_mismatch");
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/google/callback`;
    const oauthClient = createOAuthClient(redirectUri);
    const { tokens } = await oauthClient.getToken(code);
    if (!tokens.refresh_token) {
      return calendarRedirect(request, "no_refresh_token");
    }
    oauthClient.setCredentials(tokens);

    const { data: userinfo } = await google
      .oauth2({ version: "v2", auth: oauthClient })
      .userinfo.get();
    const googleEmail = userinfo.email ?? "unknown";

    // Reuse the Jourdain task calendar from a previous connection if it still
    // exists; otherwise create it.
    const existing = await getGoogleConnection(user.id);
    const calendar = google.calendar({ version: "v3", auth: oauthClient });
    let jourdainCalendarId = existing?.jourdain_calendar_id ?? null;
    if (jourdainCalendarId) {
      try {
        await calendar.calendars.get({ calendarId: jourdainCalendarId });
      } catch {
        jourdainCalendarId = null;
      }
    }
    if (!jourdainCalendarId) {
      const created = await calendar.calendars.insert({
        requestBody: {
          summary: "Jourdain",
          description: "Tasks synced from Jourdain",
        },
      });
      jourdainCalendarId = created.data.id ?? null;
    }

    const admin = createAdminClient();
    const { error } = await admin.from("google_connections").upsert(
      {
        user_id: user.id,
        google_email: googleEmail,
        refresh_token: tokens.refresh_token,
        jourdain_calendar_id: jourdainCalendarId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw new Error(error.message);

    return calendarRedirect(request);
  } catch (err) {
    console.warn(
      "[google-callback] connection failed:",
      err instanceof Error ? err.message : err
    );
    return calendarRedirect(request, "exchange_failed");
  }
}
