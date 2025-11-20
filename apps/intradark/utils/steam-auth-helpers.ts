import { createBrowserClient } from "@/utils/supabase/client";
import { getOrCreateSteamProfile, linkSteamProfileToUser } from "./steam-profile";

/**
 * Generate a consistent email format for Steam-authenticated users
 */
export function createSteamUserEmail(steamId: string): string {
  return `steamid_${steamId}@steam.local`;
}

/**
 * Generate a secure random password for Steam users
 * This password is never exposed to the client and is only used internally
 */
export function generateSecurePassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => chars[byte % chars.length])
    .join("");
}

/**
 * Find existing Supabase user by Steam ID or create a new one
 * Returns the authenticated Supabase user session
 */
export async function findOrCreateUserFromSteamId(
  steamId: string
): Promise<{ user: any; session: any } | null> {
  const supabase = createBrowserClient();
  const email = createSteamUserEmail(steamId);

  try {
    // First, try to get or create the Steam profile
    const steamProfile = await getOrCreateSteamProfile(steamId);
    if (!steamProfile) {
      console.error("Failed to get or create Steam profile");
      return null;
    }

    // Try to find existing user with this email
    const { data: existingUsers } = await supabase.auth.admin?.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email
    );

    let user;

    if (existingUser) {
      // User exists, sign them in
      // Since we can't sign in with password as user, we need to create a session
      // For now, we'll handle this in the callback route with admin methods
      user = existingUser;
    } else {
      // User doesn't exist, create one with admin API
      // Note: This requires Supabase admin credentials
      const password = generateSecurePassword();

      // We'll handle user creation in the callback route since we need admin access
      // For now, just return null and let the callback route handle it
      return null;
    }

    return { user, session: null };
  } catch (error) {
    console.error("Error finding or creating user:", error);
    return null;
  }
}

