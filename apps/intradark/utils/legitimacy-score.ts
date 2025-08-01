export interface LegitimacyScore {
  totalScore: number;
  maxScore: number;
  percentage: number;
  breakdown: {
    steam: { score: number; maxScore: number; checks: string[] };
    leetify: { score: number; maxScore: number; checks: string[] };
    faceit: { score: number; maxScore: number; checks: string[] };
    csstats: { score: number; maxScore: number; checks: string[] };
  };
}

export interface SteamProfile {
  data: {
    timecreated?: number;
    player_level: number;
    friends_count: number;
  };
}

export interface LeetifyProfile {
  recentGameRatings: {
    aim: number;
    gamesPlayed: number;
    leetify: number;
  };
}

export interface FaceitProfile {
  payload: {
    games: {
      cs2?: { faceit_elo: number };
      csgo?: { faceit_elo: number };
    };
  };
}

export interface CSStatsProfile {
  data: {
    ranks?: Array<{ total_wins?: number }>;
  };
}

export function calculateLegitimacyScore(
  steamProfile: SteamProfile | null,
  leetifyProfile: LeetifyProfile | null,
  faceitProfile: FaceitProfile | null,
  csstatsProfile: CSStatsProfile | null
): LegitimacyScore {
  let totalScore = 0;
  const maxScore = 100; // Always out of 100 points
  const breakdown = {
    steam: { score: 0, maxScore: 25, checks: [] as string[] },
    leetify: { score: 0, maxScore: 30, checks: [] as string[] },
    faceit: { score: 0, maxScore: 25, checks: [] as string[] },
    csstats: { score: 0, maxScore: 20, checks: [] as string[] },
  };

  // Steam Account Legitimacy Checks (25 points max)
  if (steamProfile) {
    const steamChecks = breakdown.steam;

    // Account age check (older accounts are more legitimate)
    if (steamProfile.data.timecreated) {
      const accountAgeDays =
        (Date.now() / 1000 - steamProfile.data.timecreated) / (24 * 60 * 60);
      if (accountAgeDays > 365) {
        steamChecks.score += 10;
        steamChecks.checks.push("✅ Account older than 1 year (+10)");
      } else if (accountAgeDays > 180) {
        steamChecks.score += 5;
        steamChecks.checks.push("✅ Account older than 6 months (+5)");
      } else {
        steamChecks.checks.push("⚠️ New account (-0)");
      }
    }

    // Steam level check
    if (steamProfile.data.player_level >= 50) {
      steamChecks.score += 10;
      steamChecks.checks.push("✅ High Steam level (+10)");
    } else if (steamProfile.data.player_level >= 20) {
      steamChecks.score += 5;
      steamChecks.checks.push("✅ Moderate Steam level (+5)");
    } else {
      steamChecks.checks.push("⚠️ Low Steam level (-0)");
    }

    // Friends count check
    if (steamProfile.data.friends_count >= 50) {
      steamChecks.score += 5;
      steamChecks.checks.push("✅ Many friends (+5)");
    } else if (steamProfile.data.friends_count >= 10) {
      steamChecks.score += 2;
      steamChecks.checks.push("✅ Some friends (+2)");
    } else {
      steamChecks.checks.push("⚠️ Few friends (-0)");
    }

    totalScore += steamChecks.score;
  }

  // Leetify Legitimacy Checks (30 points max)
  if (leetifyProfile) {
    const leetifyChecks = breakdown.leetify;

    // Aim rating check
    const aimRating = leetifyProfile.recentGameRatings.aim * 100;
    if (aimRating > 80) {
      leetifyChecks.score += 10;
      leetifyChecks.checks.push("✅ Excellent aim rating (+10)");
    } else if (aimRating > 60) {
      leetifyChecks.score += 5;
      leetifyChecks.checks.push("✅ Good aim rating (+5)");
    } else if (aimRating > 40) {
      leetifyChecks.score += 2;
      leetifyChecks.checks.push("✅ Average aim rating (+2)");
    } else {
      leetifyChecks.checks.push("⚠️ Low aim rating (-0)");
    }

    // Games played check
    const gamesPlayed = leetifyProfile.recentGameRatings.gamesPlayed;
    if (gamesPlayed >= 50) {
      leetifyChecks.score += 10;
      leetifyChecks.checks.push("✅ Many games played (+10)");
    } else if (gamesPlayed >= 20) {
      leetifyChecks.score += 5;
      leetifyChecks.checks.push("✅ Moderate games played (+5)");
    } else if (gamesPlayed >= 5) {
      leetifyChecks.score += 2;
      leetifyChecks.checks.push("✅ Some games played (+2)");
    } else {
      leetifyChecks.checks.push("⚠️ Few games played (-0)");
    }

    // Overall Leetify rating check
    const overallRating = leetifyProfile.recentGameRatings.leetify * 100;
    if (overallRating > 70) {
      leetifyChecks.score += 10;
      leetifyChecks.checks.push("✅ High overall rating (+10)");
    } else if (overallRating > 50) {
      leetifyChecks.score += 5;
      leetifyChecks.checks.push("✅ Good overall rating (+5)");
    } else {
      leetifyChecks.checks.push("⚠️ Low overall rating (-0)");
    }

    totalScore += leetifyChecks.score;
  }

  // Faceit Legitimacy Checks (25 points max)
  if (faceitProfile) {
    const faceitChecks = breakdown.faceit;

    // CS2 ELO check
    const cs2Elo = faceitProfile.payload.games.cs2?.faceit_elo;
    if (cs2Elo && cs2Elo >= 2000) {
      faceitChecks.score += 15;
      faceitChecks.checks.push("✅ High CS2 ELO (+15)");
    } else if (cs2Elo && cs2Elo >= 1500) {
      faceitChecks.score += 10;
      faceitChecks.checks.push("✅ Good CS2 ELO (+10)");
    } else if (cs2Elo && cs2Elo >= 1000) {
      faceitChecks.score += 5;
      faceitChecks.checks.push("✅ Moderate CS2 ELO (+5)");
    } else if (cs2Elo) {
      faceitChecks.checks.push("⚠️ Low CS2 ELO (-0)");
    }

    // CSGO ELO check (legacy)
    const csgoElo = faceitProfile.payload.games.csgo?.faceit_elo;
    if (csgoElo && csgoElo >= 2000) {
      faceitChecks.score += 10;
      faceitChecks.checks.push("✅ High CSGO ELO (+10)");
    } else if (csgoElo && csgoElo >= 1500) {
      faceitChecks.score += 5;
      faceitChecks.checks.push("✅ Good CSGO ELO (+5)");
    } else if (csgoElo) {
      faceitChecks.checks.push("⚠️ Low CSGO ELO (-0)");
    }

    totalScore += faceitChecks.score;
  }

  // CSStats Legitimacy Checks (20 points max)
  if (csstatsProfile) {
    const csstatsChecks = breakdown.csstats;

    // Rank data availability
    if (csstatsProfile.data.ranks && csstatsProfile.data.ranks.length > 0) {
      csstatsChecks.score += 10;
      csstatsChecks.checks.push("✅ Rank data available (+10)");
    } else {
      csstatsChecks.checks.push("⚠️ No rank data (-0)");
    }

    // Total wins check
    const totalWins =
      csstatsProfile.data.ranks?.reduce(
        (sum, rank) => sum + (rank.total_wins || 0),
        0
      ) || 0;
    if (totalWins >= 100) {
      csstatsChecks.score += 10;
      csstatsChecks.checks.push("✅ Many wins (+10)");
    } else if (totalWins >= 50) {
      csstatsChecks.score += 5;
      csstatsChecks.checks.push("✅ Moderate wins (+5)");
    } else if (totalWins > 0) {
      csstatsChecks.score += 2;
      csstatsChecks.checks.push("✅ Some wins (+2)");
    } else {
      csstatsChecks.checks.push("⚠️ No wins recorded (-0)");
    }

    totalScore += csstatsChecks.score;
  }

  return {
    totalScore,
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    breakdown,
  };
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 80) return "bg-green-500";
  if (percentage >= 70) return "bg-green-400";
  if (percentage >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export function getLegitimacyStatus(percentage: number) {
  if (percentage >= 80)
    return {
      text: "Highly Legitimate",
      color: "text-green-500",
    };
  if (percentage >= 60)
    return {
      text: "Likely Legitimate",
      color: "text-green-400",
    };
  if (percentage >= 40)
    return {
      text: "Suspicious",
      color: "text-orange-500",
    };
  return {
    text: "Highly Suspicious",
    color: "text-red-500",
  };
}
