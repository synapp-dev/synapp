import type { UserLineupFinalizeInput } from "@/entities/utility-lineups/lib/user-lineup-submit-schema";

type Technique = UserLineupFinalizeInput["technique"];
type Movement = UserLineupFinalizeInput["movement"];
type Margin = UserLineupFinalizeInput["margin"];

const isTechnique = (v: string): v is Technique =>
  (
    [
      "left_click",
      "right_click",
      "left_and_right_click",
      "jump_left_click",
      "jump_right_click",
      "jump_left_and_right_click",
    ] as const satisfies readonly Technique[]
  ).includes(v as Technique);

const isMovement = (v: string): v is Movement =>
  (
    [
      "stationary",
      "running",
      "walking",
      "crouched",
      "crouched_walking",
    ] as const satisfies readonly Movement[]
  ).includes(v as Movement);

const isMargin = (v: string): v is Margin =>
  (["low", "medium", "high"] as const satisfies readonly Margin[]).includes(v as Margin);

function capitalizeSegmentFromSlug(raw: string): string {
  return raw
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Title-case each alphabetic word (keeps `+` and other punctuation as-is). */
function toTitleCasePhrase(s: string): string {
  return s.replace(
    /\b[a-zA-Z]+\b/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );
}

/**
 * Suffix after `jump_` (e.g. `left_click`) → same wording as the non-jump technique.
 */
function formatJumpSuffixTechniqueLabel(suffix: string): string {
  if (!suffix) return "";
  switch (suffix) {
    case "left_click":
      return "Left click";
    case "right_click":
      return "Right click";
    case "left_and_right_click":
      return "Left + right";
    default:
      return capitalizeSegmentFromSlug(suffix);
  }
}

/** Human-readable technique (DB slug → label). */
export function formatUtilityLineupTechniqueLabel(raw: string): string {
  let label: string;
  if (!isTechnique(raw)) {
    label = capitalizeSegmentFromSlug(raw);
  } else {
    switch (raw) {
      case "left_click":
        label = "Left click";
        break;
      case "right_click":
        label = "Right click";
        break;
      case "left_and_right_click":
        label = "Left + right";
        break;
      case "jump_left_click":
        label = "Jump + left";
        break;
      case "jump_right_click":
        label = "Jump + right";
        break;
      case "jump_left_and_right_click":
        label = "Jump + both";
        break;
    }
  }
  return toTitleCasePhrase(label);
}

/** Human-readable movement / stance (DB slug → label). */
export function formatUtilityLineupMovementLabel(raw: string): string {
  let label: string;
  if (!isMovement(raw)) {
    label = capitalizeSegmentFromSlug(raw);
  } else {
    switch (raw) {
      case "stationary":
        label = "Standing";
        break;
      case "running":
        label = "Running";
        break;
      case "walking":
        label = "Walking";
        break;
      case "crouched":
        label = "Crouched";
        break;
      case "crouched_walking":
        label = "Crouch walking";
        break;
    }
  }
  return toTitleCasePhrase(label);
}

/** Human-readable release margin. */
export function formatUtilityLineupMarginLabel(raw: string): string {
  let label: string;
  if (!isMargin(raw)) {
    label = capitalizeSegmentFromSlug(raw);
  } else {
    switch (raw) {
      case "low":
        label = "Low margin";
        break;
      case "medium":
        label = "Medium margin";
        break;
      case "high":
        label = "High margin";
        break;
    }
  }
  return toTitleCasePhrase(label);
}

/** Single line like the reference: `Left Click + Standing + Medium Margin`. */
export function formatUtilityLineupThrowMetaSummary(lineup: {
  technique: string;
  movement: string;
  margin: string;
}): string {
  return [
    formatUtilityLineupTechniqueLabel(lineup.technique),
    formatUtilityLineupMovementLabel(lineup.movement),
    formatUtilityLineupMarginLabel(lineup.margin),
  ].join(" + ");
}

/** Segments for movement + technique (for UI separators between parts). */
export function utilityLineupMovementTechniqueChainParts(lineup: {
  movement: string;
  technique: string;
}): string[] {
  const movementLabel = isMovement(lineup.movement)
    ? formatUtilityLineupMovementLabel(lineup.movement)
    : toTitleCasePhrase(capitalizeSegmentFromSlug(lineup.movement));

  const tech = lineup.technique;

  if (tech.startsWith("jump_")) {
    const suffix = tech.slice("jump_".length);
    const rest = toTitleCasePhrase(formatJumpSuffixTechniqueLabel(suffix));
    return [movementLabel, "Jump", rest].filter(Boolean);
  }

  const techniqueLabel = isTechnique(tech)
    ? formatUtilityLineupTechniqueLabel(tech)
    : toTitleCasePhrase(capitalizeSegmentFromSlug(tech));

  return [movementLabel, techniqueLabel].filter(Boolean);
}

/**
 * Movement + technique for hover, e.g. `Running + Jump + Left Click` when technique is
 * `jump_left_click` (jump is its own segment).
 */
export function formatUtilityLineupMovementTechniqueChain(lineup: {
  movement: string;
  technique: string;
}): string {
  return utilityLineupMovementTechniqueChainParts(lineup).join(" + ");
}
