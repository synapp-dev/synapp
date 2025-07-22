import { NextRequest, NextResponse } from "next/server";

interface SteamProfileResponse {
  response: {
    players: Array<{
      steamid: string;
      communityvisibilitystate: number;
      profilestate: number;
      personaname: string;
      commentpermission: number;
      profileurl: string;
      avatar: string;
      avatarmedium: string;
      avatarfull: string;
      avatarhash: string;
      personastate: number;
      realname: string;
      primaryclanid: string;
      timecreated: number;
      personastateflags: number;
      gameextrainfo: string;
      gameid: string;
      lastlogoff?: number;
    }>;
  };
}

interface SteamLevelResponse {
  response: {
    player_level: number;
  };
}

interface SteamFriendsResponse {
  friendslist: {
    friends: Array<{
      steamid: string;
      relationship: string;
      friend_since: number;
    }>;
  };
}

interface SteamProfileResult {
  success: boolean;
  data?: {
    steamid: string;
    personaname: string;
    avatarfull: string;
    profileurl: string;
    realname?: string;
    timecreated?: number;
    lastlogoff?: number;
    player_level: number;
    friends_count: number;
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: steamId } = await context.params;
    const steamApiKey = process.env.STEAM_API_KEY;

    if (!steamApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Steam API key is not configured",
        } as SteamProfileResult,
        { status: 500 }
      );
    }

    // Validate Steam ID format (should be 17 digits for Steam ID64)
    if (!/^\d{17}$/.test(steamId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid Steam ID format. Please provide a valid Steam ID64 (17 digits)",
        } as SteamProfileResult,
        { status: 400 }
      );
    }

    // Fetch basic profile information
    const profileUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`;
    const profileResponse = await fetch(profileUrl);

    if (!profileResponse.ok) {
      throw new Error(
        `Steam API profile request failed: ${profileResponse.status}`
      );
    }

    const profileData: SteamProfileResponse = await profileResponse.json();

    if (
      !profileData.response.players ||
      profileData.response.players.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Steam profile not found",
        } as SteamProfileResult,
        { status: 404 }
      );
    }

    const player = profileData.response.players[0];

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error: "Steam profile not found",
        } as SteamProfileResult,
        { status: 404 }
      );
    }

    // Fetch Steam level
    const levelUrl = `http://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${steamApiKey}&steamid=${steamId}`;
    const levelResponse = await fetch(levelUrl);
    let steamLevel = 0;

    if (levelResponse.ok) {
      const levelData: SteamLevelResponse = await levelResponse.json();
      steamLevel = levelData.response.player_level;
    }

    // Fetch friends list
    const friendsUrl = `http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${steamApiKey}&steamid=${steamId}&relationship=friend`;
    const friendsResponse = await fetch(friendsUrl);
    let friendsCount = 0;

    if (friendsResponse.ok) {
      const friendsData: SteamFriendsResponse = await friendsResponse.json();
      friendsCount = friendsData.friendslist.friends.length;
    }

    const result: SteamProfileResult = {
      success: true,
      data: {
        steamid: player.steamid,
        personaname: player.personaname,
        avatarfull: player.avatarfull,
        profileurl: player.profileurl,
        realname: player.realname || undefined,
        timecreated: player.timecreated,
        lastlogoff: player.lastlogoff,
        player_level: steamLevel,
        friends_count: friendsCount,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Steam API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch Steam profile information",
      } as SteamProfileResult,
      { status: 500 }
    );
  }
}
