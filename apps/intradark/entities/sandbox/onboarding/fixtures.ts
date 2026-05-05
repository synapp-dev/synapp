import type { User } from "@supabase/supabase-js";

import type { CurrentUserProfiles } from "@/lib/get-current-user-profiles";
import type { Database } from "@/types/supabase";

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];
type SteamProfileRow = Database["public"]["Tables"]["steam_profiles"]["Row"];

const ISO = "2026-05-04T12:00:00.000Z";

const SANDBOX_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "sandbox@intradark.local",
  email_confirmed_at: ISO,
  phone: "",
  confirmed_at: ISO,
  last_sign_in_at: ISO,
  app_metadata: {},
  user_metadata: {},
  identities: [],
  factors: undefined,
  created_at: ISO,
  updated_at: ISO,
  is_anonymous: false,
} as unknown as User;

const BASE_STEAM: SteamProfileRow = {
  steamid64: 76561198000000001,
  steamid: "76561198000000001",
  personaname: "SandboxPlayer",
  profileurl: "https://steamcommunity.com/id/sandbox/",
  avatar: null,
  avatarmedium: null,
  avatarfull: "/images/players/donk-headshot.png",
  personastate: 1,
  communityvisibilitystate: 3,
  profilestate: 1,
  lastlogoff: null,
  commentpermission: 0,
  realname: null,
  primaryclanid: null,
  timecreated: null,
  gameid: null,
  gameserverip: null,
  gameextrainfo: null,
  cityid: null,
  loccountrycode: "US",
  locstatecode: null,
  loccityid: null,
  created_at: ISO,
  updated_at: ISO,
};

function baseUserProfile(overrides: Partial<UserProfileRow>): UserProfileRow {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    user_id: SANDBOX_USER.id,
    steam_profile_id: BASE_STEAM.steamid64,
    discord_user_id: "123456789012345678",
    username: "sandbox_user",
    display_name: "Sandbox User",
    bio: null,
    avatar_url: "/images/players/donk-headshot.png",
    email: "sandbox@intradark.local",
    is_verified: true,
    is_premium: false,
    preferences: {},
    last_active: ISO,
    created_at: ISO,
    updated_at: ISO,
    ...overrides,
  };
}

export type EligibilityState =
  | "not-signed-in"
  | "steam-only"
  | "discord-only"
  | "both-linked-not-banned"
  | "banned"
  | "cooldown-active";

export type OnboardingSandboxFlags = {
  banned?: boolean;
  cooldownSecondsRemaining?: number | null;
};

export function eligibilityFlags(
  state: EligibilityState,
): OnboardingSandboxFlags {
  if (state === "banned") return { banned: true };
  if (state === "cooldown-active") return { cooldownSecondsRemaining: 270 };
  return {};
}

export function profilesForEligibility(
  state: EligibilityState,
): CurrentUserProfiles | null {
  if (state === "not-signed-in") {
    return null;
  }

  if (state === "steam-only") {
    return {
      user: SANDBOX_USER,
      userProfile: baseUserProfile({
        discord_user_id: null,
        steam_profile_id: BASE_STEAM.steamid64,
      }),
      steamProfile: BASE_STEAM,
    };
  }

  if (state === "discord-only") {
    return {
      user: SANDBOX_USER,
      userProfile: baseUserProfile({
        steam_profile_id: null,
        discord_user_id: "987654321098765432",
        display_name: "DiscordOnly",
      }),
      steamProfile: null,
    };
  }

  if (state === "both-linked-not-banned") {
    return {
      user: SANDBOX_USER,
      userProfile: baseUserProfile({
        discord_user_id: "123456789012345678",
        steam_profile_id: BASE_STEAM.steamid64,
      }),
      steamProfile: BASE_STEAM,
    };
  }

  if (state === "banned" || state === "cooldown-active") {
    return {
      user: SANDBOX_USER,
      userProfile: baseUserProfile({
        discord_user_id: "123456789012345678",
        steam_profile_id: BASE_STEAM.steamid64,
      }),
      steamProfile: BASE_STEAM,
    };
  }

  return null;
}

export const SANDBOX_STEAM_EMAIL_DATA = {
  steamId64: BASE_STEAM.steamid64,
  personaname: BASE_STEAM.personaname,
  avatarfull: BASE_STEAM.avatarfull ?? "",
  profileurl: BASE_STEAM.profileurl ?? "",
} as const;
