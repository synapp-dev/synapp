/** Demo-only data for player profile showcase UI. */

export type FormMetricKey =
  | "rating"
  | "kdr"
  | "kpr"
  | "dpr"
  | "adr"
  | "impact";

export type FormTimeRange = "recent" | "all";

export type FormDataPoint = { x: string; value: number };

export type FormShowcase = {
  metrics: Record<
    FormMetricKey,
    {
      label: string;
      format: (v: number) => string;
      recent: FormDataPoint[];
      allTime: FormDataPoint[];
      summaryRecent: number;
      summaryAll: number;
      trendUp: boolean;
    }
  >;
};

const wave = (base: number, len: number, amp: number, seed = 0) =>
  Array.from({ length: len }, (_, i) => ({
    x: `M${i + 1}`,
    value: Math.max(
      0,
      base + amp * Math.sin((i + seed) * 0.45) + (i % 3) * 0.02 * base,
    ),
  }));

export const FORM_SHOWCASE: FormShowcase = {
  metrics: {
    rating: {
      label: "Rating",
      format: (v) => v.toFixed(2),
      recent: wave(1.12, 14, 0.18, 1),
      allTime: wave(1.27, 24, 0.12, 2),
      summaryRecent: 1.12,
      summaryAll: 1.27,
      trendUp: true,
    },
    kdr: {
      label: "KDR",
      format: (v) => v.toFixed(2),
      recent: wave(1.05, 14, 0.22, 3),
      allTime: wave(1.18, 24, 0.15, 0),
      summaryRecent: 1.05,
      summaryAll: 1.18,
      trendUp: true,
    },
    kpr: {
      label: "KPR",
      format: (v) => v.toFixed(2),
      recent: wave(0.68, 14, 0.08, 2),
      allTime: wave(0.74, 24, 0.06, 1),
      summaryRecent: 0.68,
      summaryAll: 0.74,
      trendUp: true,
    },
    dpr: {
      label: "DPR",
      format: (v) => v.toFixed(2),
      recent: wave(0.58, 14, 0.07, 0),
      allTime: wave(0.62, 24, 0.05, 3),
      summaryRecent: 0.58,
      summaryAll: 0.62,
      trendUp: false,
    },
    adr: {
      label: "ADR",
      format: (v) => v.toFixed(1),
      recent: wave(72, 14, 9, 1),
      allTime: wave(78, 24, 6, 2),
      summaryRecent: 72,
      summaryAll: 78,
      trendUp: true,
    },
    impact: {
      label: "Impact",
      format: (v) => v.toFixed(2),
      recent: wave(1.02, 14, 0.2, 4),
      allTime: wave(1.14, 24, 0.14, 1),
      summaryRecent: 1.02,
      summaryAll: 1.14,
      trendUp: true,
    },
  },
};

export type MapStatQuality = "good" | "okay" | "poor";

export type MapStatRow = {
  label: string;
  valueDisplay: string;
  quality: MapStatQuality;
  fillPercent: number;
};

export type MapBestMatch = {
  opponent: string;
  score: string;
  event: string;
  date: string;
  rating: string;
};

export type MapSlide = {
  id: string;
  name: string;
  /** Background; reuse portrait as blurred stand-in when no map art */
  imageSrc: string;
  stats: MapStatRow[];
  best: MapBestMatch;
};

const chartGood = "var(--chart-2)";
const chartMid = "var(--chart-4)";
const chartPoor = "var(--chart-1)";

function qualityColor(q: MapStatQuality): string {
  switch (q) {
    case "good":
      return chartGood;
    case "okay":
      return chartMid;
    case "poor":
      return chartPoor;
  }
}

export function mapStatIndicatorStyle(q: MapStatQuality): {
  backgroundColor: string;
} {
  return { backgroundColor: qualityColor(q) };
}

export const MAP_SLIDES_OFFICIALS: MapSlide[] = [
  {
    id: "mirage",
    name: "Mirage",
    imageSrc: "/images/players/niko-headshot.png",
    stats: [
      {
        label: "Rating",
        valueDisplay: "1.13",
        quality: "okay",
        fillPercent: 62,
      },
      {
        label: "ADR",
        valueDisplay: "68.1",
        quality: "poor",
        fillPercent: 55,
      },
      {
        label: "Impact",
        valueDisplay: "1.17",
        quality: "good",
        fillPercent: 78,
      },
      {
        label: "KPR",
        valueDisplay: "0.71",
        quality: "okay",
        fillPercent: 58,
      },
      {
        label: "DPR",
        valueDisplay: "0.62",
        quality: "good",
        fillPercent: 72,
      },
      {
        label: "KAST",
        valueDisplay: "61.4%",
        quality: "poor",
        fillPercent: 48,
      },
    ],
    best: {
      opponent: "Astralis",
      score: "2 : 1",
      event: "ESL One Cologne",
      date: "26th July 2021",
      rating: "1.96",
    },
  },
  {
    id: "inferno",
    name: "Inferno",
    imageSrc: "/images/players/niko-headshot.png",
    stats: [
      {
        label: "Rating",
        valueDisplay: "1.21",
        quality: "good",
        fillPercent: 74,
      },
      {
        label: "ADR",
        valueDisplay: "81.2",
        quality: "good",
        fillPercent: 82,
      },
      {
        label: "Impact",
        valueDisplay: "1.09",
        quality: "okay",
        fillPercent: 60,
      },
      {
        label: "KPR",
        valueDisplay: "0.76",
        quality: "good",
        fillPercent: 70,
      },
      {
        label: "DPR",
        valueDisplay: "0.59",
        quality: "good",
        fillPercent: 68,
      },
      {
        label: "KAST",
        valueDisplay: "70.1%",
        quality: "good",
        fillPercent: 71,
      },
    ],
    best: {
      opponent: "Vitality",
      score: "2 : 0",
      event: "IEM Katowice",
      date: "12th February 2023",
      rating: "1.88",
    },
  },
];

export const MAP_SLIDES_FACEIT: MapSlide[] = [
  {
    id: "ancient-f",
    name: "Ancient",
    imageSrc: "/images/players/niko-headshot.png",
    stats: [
      {
        label: "Rating",
        valueDisplay: "1.08",
        quality: "okay",
        fillPercent: 56,
      },
      {
        label: "ADR",
        valueDisplay: "74.0",
        quality: "okay",
        fillPercent: 64,
      },
      {
        label: "Impact",
        valueDisplay: "1.22",
        quality: "good",
        fillPercent: 80,
      },
      {
        label: "KPR",
        valueDisplay: "0.69",
        quality: "okay",
        fillPercent: 57,
      },
      {
        label: "DPR",
        valueDisplay: "0.64",
        quality: "okay",
        fillPercent: 59,
      },
      {
        label: "KAST",
        valueDisplay: "66.0%",
        quality: "okay",
        fillPercent: 63,
      },
    ],
    best: {
      opponent: "FURIA",
      score: "16 : 12",
      event: "FACEIT Pro League",
      date: "3rd March 2025",
      rating: "1.72",
    },
  },
];

export function qualityLabel(q: MapStatQuality): string {
  switch (q) {
    case "good":
      return "GOOD";
    case "okay":
      return "OKAY";
    case "poor":
      return "POOR";
  }
}

export type MatchRow = {
  id: string;
  win: boolean;
  opponent: string;
  event: string;
  date: string;
  score: string;
  rating: number;
};

export const MATCHES_RECENT: MatchRow[] = [
  {
    id: "1",
    win: false,
    opponent: "FaZe",
    event: "Esports World Cup 2024",
    date: "26th July 2024",
    score: "0 : 2",
    rating: 0.86,
  },
  {
    id: "2",
    win: true,
    opponent: "FURIA",
    event: "Esports World Cup 2024",
    date: "24th July 2024",
    score: "3 : 2",
    rating: 1.24,
  },
  {
    id: "3",
    win: true,
    opponent: "Rooster",
    event: "Esports World Cup 2024",
    date: "21st July 2024",
    score: "2 : 0",
    rating: 1.41,
  },
];

export const MATCHES_UPCOMING: MatchRow[] = [
  {
    id: "u1",
    win: false,
    opponent: "Spirit",
    event: "BLAST Premier",
    date: "2nd May 2026",
    score: "—",
    rating: 0,
  },
  {
    id: "u2",
    win: false,
    opponent: "MOUZ",
    event: "ESL Pro League",
    date: "9th May 2026",
    score: "—",
    rating: 0,
  },
];

export type TeammateSlide = {
  id: string;
  handle: string;
  fullName: string;
  ageLabel: string;
  role: string;
  teamName: string;
  countryFlag: string;
  portraitSrc: string;
  bgSrc: string;
  ratingBadge: string;
  placementBadge: string;
  /** When true, card uses staff styling (e.g. coach). */
  isCoach?: boolean;
};

/** Header card for the roster grid (showcase). */
export const TEAM_ROSTER_HEADER = {
  id: "team-falcons",
  name: "Falcons",
  subtitle: "Counter-Strike roster",
  logoSrc: "/images/teams/falcons-logo.png",
  logoBgSrc: "/images/teams/falcons-logo.png",
} as const;

/** NiKo's roster-mates + coach on Falcons (showcase). */
export const TEAMMATE_SLIDES: TeammateSlide[] = [
  {
    id: "t-teses",
    handle: "TeSeS",
    fullName: "René Madsen",
    ageLabel: "27 years",
    role: "Entry",
    teamName: "Falcons",
    countryFlag: "🇩🇰",
    portraitSrc: "/images/players/niko-headshot.png",
    bgSrc: "/images/players/niko-headshot.png",
    ratingBadge: "1.12",
    placementBadge: "Finalist",
  },
  {
    id: "t-monesy",
    handle: "m0NESY",
    fullName: "Ilya Osipov",
    ageLabel: "21 years",
    role: "AWPer",
    teamName: "Falcons",
    countryFlag: "🇷🇺",
    portraitSrc: "/images/players/niko-headshot.png",
    bgSrc: "/images/players/niko-headshot.png",
    ratingBadge: "1.31",
    placementBadge: "Finalist",
  },
  {
    id: "t-kyxsan",
    handle: "kyxsan",
    fullName: "Damjan Stoilkovski",
    ageLabel: "30 years",
    role: "IGL",
    teamName: "Falcons",
    countryFlag: "🇲🇰",
    portraitSrc: "/images/players/niko-headshot.png",
    bgSrc: "/images/players/niko-headshot.png",
    ratingBadge: "0.98",
    placementBadge: "Finalist",
  },
  {
    id: "t-kyousuke",
    handle: "kyousuke",
    fullName: "Maksim Lukin",
    ageLabel: "19 years",
    role: "Rifle",
    teamName: "Falcons",
    countryFlag: "🇷🇺",
    portraitSrc: "/images/players/niko-headshot.png",
    bgSrc: "/images/players/niko-headshot.png",
    ratingBadge: "1.05",
    placementBadge: "Finalist",
  },
  {
    id: "t-zonic",
    handle: "zonic",
    fullName: "Danny Sørensen",
    ageLabel: "41 years",
    role: "Head coach",
    teamName: "Falcons",
    countryFlag: "🇩🇰",
    portraitSrc: "/images/players/niko-headshot.png",
    bgSrc: "/images/players/niko-headshot.png",
    ratingBadge: "Staff",
    placementBadge: "4× Major",
    isCoach: true,
  },
];

export type MediaItem = {
  id: string;
  src: string;
  alt: string;
  watermark?: string;
};

export type MediaShowcase = {
  photos: MediaItem[];
  videos: MediaItem[];
  recent: MediaItem[];
};

export const MEDIA_SHOWCASE: MediaShowcase = {
  photos: [
    {
      id: "p1",
      src: "/images/players/niko-headshot.png",
      alt: "Player at the desk",
      watermark: ".TV",
    },
  ],
  videos: [
    {
      id: "v1",
      src: "/images/players/niko-headshot.png",
      alt: "Highlight reel placeholder",
    },
  ],
  recent: [
    {
      id: "r1",
      src: "/images/players/niko-headshot.png",
      alt: "Recent capture placeholder",
    },
  ],
};
