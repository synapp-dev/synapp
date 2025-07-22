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

interface SteamProfileInfo {
  steamId: string;
  personaName: string;
  profileUrl: string;
  avatar: string;
  avatarFull: string;
  accountAge: number; // in days
  steamLevel: number;
  friendsCount: number;
  realName?: string;
  profileState: number;
  communityVisibilityState: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get("steamId");
    const steamApiKey = process.env.STEAM_API_KEY;

    if (!steamId) {
      return NextResponse.json(
        { error: "Steam ID is required" },
        { status: 400 }
      );
    }

    if (!steamApiKey) {
      return NextResponse.json(
        { error: "Steam API key is not configured" },
        { status: 500 }
      );
    }

    // Validate Steam ID format (should be 17 digits for Steam ID64)
    if (!/^\d{17}$/.test(steamId)) {
      return NextResponse.json(
        {
          error:
            "Invalid Steam ID format. Please provide a valid Steam ID64 (17 digits)",
        },
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
        { error: "Steam profile not found" },
        { status: 404 }
      );
    }

    const player = profileData.response.players[0];

    if (!player) {
      return NextResponse.json(
        { error: "Steam profile not found" },
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

    // Calculate account age in days
    const accountAge = player.timecreated
      ? Math.floor((Date.now() / 1000 - player.timecreated) / (24 * 60 * 60))
      : 0;

    const profileInfo: SteamProfileInfo = {
      steamId: player.steamid,
      personaName: player.personaname,
      profileUrl: player.profileurl,
      avatar: player.avatar,
      avatarFull: player.avatarfull,
      accountAge,
      steamLevel,
      friendsCount,
      realName: player.realname || undefined,
      profileState: player.profilestate,
      communityVisibilityState: player.communityvisibilitystate,
    };

    return NextResponse.json(profileInfo);
  } catch (error) {
    console.error("Steam API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Steam profile information" },
      { status: 500 }
    );
  }
}
