import {
  scoreCorroboration,
  scoreEstablishment,
  scoreKarma,
  scorePlausibility,
} from "@/entities/players/lib/legitimacy/axes";
import { computeCoherence } from "@/entities/players/lib/legitimacy/coherence";
import {
  confidenceBand,
  computeCoverage,
  listInputsPresent,
} from "@/entities/players/lib/legitimacy/coverage";
import { clamp100 } from "@/entities/players/lib/legitimacy/normalize";
import {
  collectPenalties,
  totalPenaltyPoints,
} from "@/entities/players/lib/legitimacy/penalties";
import { mapTier } from "@/entities/players/lib/legitimacy/tier";
import {
  AXIS_WEIGHTS,
  NEUTRAL_PRIOR,
  type LegitimacyInput,
  type LegitimacyResult,
} from "@/entities/players/lib/legitimacy/types";

export function computeLegitimacy(input: LegitimacyInput): LegitimacyResult {
  const plausibility = scorePlausibility(input);
  const establishment = scoreEstablishment(input);
  const corroboration = scoreCorroboration(input);
  const karma = scoreKarma();

  const weighted =
    plausibility.score * AXIS_WEIGHTS.plausibility +
    establishment.score * AXIS_WEIGHTS.establishment +
    corroboration.score * AXIS_WEIGHTS.corroboration +
    karma.score * AXIS_WEIGHTS.karma;

  const penalties = collectPenalties(input);
  const penaltyTotal = totalPenaltyPoints(penalties);
  const rawScore = clamp100(weighted - penaltyTotal);

  const coverage = computeCoverage(input);
  const confidence = confidenceBand(coverage);
  const score = Math.round(
    clamp100(coverage * rawScore + (1 - coverage) * NEUTRAL_PRIOR),
  );
  const tier = mapTier(score);

  const coherence = computeCoherence(input);
  const inputsPresent = listInputsPresent(input);

  const positiveFlags = [
    ...establishment.drivers.slice(0, 2),
    ...corroboration.drivers.slice(0, 2),
    ...plausibility.drivers.filter((d) => !d.includes("mismatch")).slice(0, 1),
  ].slice(0, 3);

  const riskFlags = [
    ...penalties.map((p) => p.label),
    ...plausibility.drivers.filter((d) => d.includes("mismatch")),
  ].slice(0, 3);

  return {
    score,
    rawScore: Math.round(rawScore),
    tier,
    confidence,
    coverage: Number(coverage.toFixed(3)),
    breakdown: {
      axes: {
        plausibility: {
          score: plausibility.score,
          weight: AXIS_WEIGHTS.plausibility,
          drivers: plausibility.drivers,
        },
        establishment: {
          score: establishment.score,
          weight: AXIS_WEIGHTS.establishment,
          drivers: establishment.drivers,
        },
        corroboration: {
          score: corroboration.score,
          weight: AXIS_WEIGHTS.corroboration,
          drivers: corroboration.drivers,
        },
        karma: {
          score: karma.score,
          weight: AXIS_WEIGHTS.karma,
          note: karma.note,
        },
      },
      penalties,
      flags: { positive: positiveFlags, risk: riskFlags },
      coherence: {
        skillEstimate: Number(coherence.skillEstimate.toFixed(3)),
        earnedEstimate: Number(coherence.earnedEstimate.toFixed(3)),
        suspicion: Number(coherence.suspicion.toFixed(3)),
      },
      inputsPresent,
    },
  };
}
