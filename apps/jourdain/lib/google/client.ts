import { google, type Auth } from "googleapis";
import { createAdminClient } from "@/utils/supabase/admin";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export type GoogleConnection = {
  user_id: string;
  google_email: string;
  refresh_token: string;
  jourdain_calendar_id: string | null;
};

export function createOAuthClient(redirectUri?: string): Auth.OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function getGoogleConnection(
  userId: string
): Promise<GoogleConnection | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_connections")
    .select("user_id, google_email, refresh_token, jourdain_calendar_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as GoogleConnection | null) ?? null;
}

export function authorizedClientFor(
  connection: GoogleConnection
): Auth.OAuth2Client {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: connection.refresh_token });
  return client;
}

/** Connection + authorized client in one step; null when not connected. */
export async function getCalendarContext(userId: string) {
  const connection = await getGoogleConnection(userId);
  if (!connection) return null;
  const auth = authorizedClientFor(connection);
  const calendar = google.calendar({ version: "v3", auth });
  return { connection, calendar };
}

/** Connection + authorized Gmail client; null when not connected. */
export async function getGmailContext(userId: string) {
  const connection = await getGoogleConnection(userId);
  if (!connection) return null;
  const auth = authorizedClientFor(connection);
  const gmail = google.gmail({ version: "v1", auth });
  return { connection, gmail };
}
