export type LobbyPlayerMock = {
  id: string;
  displayName: string;
  org: string;
  avatarSrc: string;
  rating: number;
  rank: number;
  verified: boolean;
  starred: boolean;
  discordJoined: boolean;
  active: boolean;
};

export type LobbyTeamMock = {
  name: string;
  players: LobbyPlayerMock[];
};

export const MOCK_TEAM_NORTH: LobbyTeamMock = {
  name: "Team North",
  players: [
    {
      id: "n1",
      displayName: "donk",
      org: "Spirit",
      avatarSrc: "/images/players/donk-headshot.png",
      rating: 1.42,
      rank: 3,
      verified: true,
      starred: true,
      discordJoined: true,
      active: true,
    },
    {
      id: "n2",
      displayName: "s1mple",
      org: "BC.GAME",
      avatarSrc: "/images/players/s1mple-headshot.png",
      rating: 1.28,
      rank: 12,
      verified: true,
      starred: false,
      discordJoined: true,
      active: false,
    },
    {
      id: "n3",
      displayName: "m0NESY",
      org: "Falcons",
      avatarSrc: "/images/players/m0nesy-headshot.png",
      rating: 1.35,
      rank: 7,
      verified: true,
      starred: true,
      discordJoined: false,
      active: false,
    },
    {
      id: "n4",
      displayName: "ZywOo",
      org: "Vitality",
      avatarSrc: "/images/players/zywoo-headshot.png",
      rating: 1.31,
      rank: 9,
      verified: true,
      starred: false,
      discordJoined: true,
      active: false,
    },
    {
      id: "n5",
      displayName: "NiKo",
      org: "Falcons",
      avatarSrc: "/images/players/niko-headshot.png",
      rating: 1.22,
      rank: 24,
      verified: true,
      starred: false,
      discordJoined: false,
      active: false,
    },
  ],
};

export const MOCK_TEAM_SOUTH: LobbyTeamMock = {
  name: "Team South",
  players: [
    {
      id: "s1",
      displayName: "TeSeS",
      org: "Vitality",
      avatarSrc: "/images/players/teses-headshot.png",
      rating: 1.18,
      rank: 31,
      verified: true,
      starred: false,
      discordJoined: true,
      active: false,
    },
    {
      id: "s2",
      displayName: "m0NESY",
      org: "Falcons",
      avatarSrc: "/images/players/m0nesy-headshot.png",
      rating: 1.35,
      rank: 7,
      verified: true,
      starred: true,
      discordJoined: true,
      active: true,
    },
    {
      id: "s3",
      displayName: "donk",
      org: "Spirit",
      avatarSrc: "/images/players/donk-headshot.png",
      rating: 1.42,
      rank: 3,
      verified: true,
      starred: true,
      discordJoined: false,
      active: false,
    },
    {
      id: "s4",
      displayName: "s1mple",
      org: "BC.GAME",
      avatarSrc: "/images/players/s1mple-headshot.png",
      rating: 1.28,
      rank: 12,
      verified: true,
      starred: false,
      discordJoined: true,
      active: false,
    },
    {
      id: "s5",
      displayName: "ZywOo",
      org: "Vitality",
      avatarSrc: "/images/players/zywoo-headshot.png",
      rating: 1.31,
      rank: 9,
      verified: true,
      starred: false,
      discordJoined: false,
      active: false,
    },
  ],
};
