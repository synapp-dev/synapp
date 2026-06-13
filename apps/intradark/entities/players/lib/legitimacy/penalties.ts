import type { LegitimacyInput, LegitimacyPenalty } from "@/entities/players/lib/legitimacy/types";

function vacPenaltyPoints(banAgeDays: number | null | undefined): number {
  const base = 40;
  if (banAgeDays == null || banAgeDays <= 0) return base;
  const decay = Math.min(10, Math.floor(banAgeDays / 365) * 3);
  return Math.max(25, base - decay);
}

export function collectPenalties(input: LegitimacyInput): LegitimacyPenalty[] {
  const penalties: LegitimacyPenalty[] = [];

  const vac = input.vacBanned === true || input.gcVacBanned === true;
  if (vac) {
    penalties.push({
      code: "vac_ban",
      points: vacPenaltyPoints(input.banAgeDays),
      label: "VAC ban on record",
    });
  }

  if (input.gameBanned) {
    penalties.push({
      code: "game_ban",
      points: 15,
      label: "Game ban on record",
    });
  }

  if (input.communityBanned) {
    penalties.push({
      code: "community_ban",
      points: 12,
      label: "Community ban on record",
    });
  }

  if (input.economyBan && input.economyBan !== "none") {
    penalties.push({
      code: "economy_ban",
      points: 10,
      label: "Steam economy ban",
    });
  }

  if (input.communityVisibility === 1) {
    penalties.push({
      code: "private_profile",
      points: 12,
      label: "Fully private Steam profile",
    });
  }

  return penalties;
}

export function totalPenaltyPoints(penalties: LegitimacyPenalty[]): number {
  return penalties.reduce((sum, p) => sum + p.points, 0);
}
