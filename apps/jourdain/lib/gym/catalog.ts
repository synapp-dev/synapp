import type { MuscleSubgroup, Station } from "@/entities/gym/model/types";

// Curated starter library for the Force USA G20 Pro All-In-One Trainer.
// Each exercise tags a primary subgroup plus the subgroups it works secondarily
// (compound lifts list several). Every one of the 21 subgroups has at least one
// exercise that trains it as the primary mover. Seeded per-user, idempotent on slug.

export type CatalogExercise = {
  slug: string;
  name: string;
  strengthLevelSlug?: string;
  subgroup: MuscleSubgroup;
  station: Station;
  secondarySubgroups?: MuscleSubgroup[];
  isUnilateral?: boolean;
  /**
   * Bodyweight movement (pull-up, dip, …). Its strengthlevel standards are
   * total-weight 1RMs (bodyweight + added), so rating folds the lifter's
   * bodyweight into the logged load. See {@link seedDefaultExercises}.
   */
  isBodyweight?: boolean;
};

export const G20_CATALOG: CatalogExercise[] = [
  // ── Chest ──────────────────────────────────────────────────────────────
  { slug: "smith-bench-press", strengthLevelSlug: "smith-machine-bench-press", name: "Smith Bench Press", subgroup: "chest_middle", station: "smith", secondarySubgroups: ["chest_lower", "delts_front", "triceps"] },
  { slug: "smith-incline-bench-press", strengthLevelSlug: "incline-bench-press", name: "Smith Incline Bench Press", subgroup: "chest_upper", station: "smith", secondarySubgroups: ["delts_front", "triceps"] },
  { slug: "smith-decline-bench-press", strengthLevelSlug: "decline-bench-press", name: "Smith Decline Bench Press", subgroup: "chest_lower", station: "smith", secondarySubgroups: ["triceps"] },
  { slug: "cable-chest-press", name: "Cable Chest Press", subgroup: "chest_middle", station: "cable", secondarySubgroups: ["triceps", "delts_front"] },
  { slug: "cable-crossover-high", strengthLevelSlug: "cable-fly", name: "Cable Crossover (High to Low)", subgroup: "chest_lower", station: "cable", secondarySubgroups: ["chest_middle"] },
  { slug: "cable-crossover-low", strengthLevelSlug: "cable-fly", name: "Cable Crossover (Low to High)", subgroup: "chest_upper", station: "cable", secondarySubgroups: ["chest_middle"] },
  { slug: "cable-fly", strengthLevelSlug: "cable-fly", name: "Cable Fly", subgroup: "chest_middle", station: "cable" },
  { slug: "chest-dip", strengthLevelSlug: "dips", name: "Chest Dip", subgroup: "chest_lower", station: "chin_up", secondarySubgroups: ["triceps", "delts_front"], isBodyweight: true },

  // ── Back ───────────────────────────────────────────────────────────────
  { slug: "lat-pulldown", strengthLevelSlug: "lat-pulldown", name: "Lat Pulldown", subgroup: "back_lats", station: "lat_pulldown", secondarySubgroups: ["biceps", "delts_rear"] },
  { slug: "close-grip-lat-pulldown", strengthLevelSlug: "close-grip-lat-pulldown", name: "Close-Grip Lat Pulldown", subgroup: "back_lats", station: "lat_pulldown", secondarySubgroups: ["biceps"] },
  { slug: "straight-arm-pulldown", strengthLevelSlug: "straight-arm-pulldown", name: "Straight-Arm Pulldown", subgroup: "back_lats", station: "cable", secondarySubgroups: ["serratus"] },
  { slug: "cable-pullover", strengthLevelSlug: "straight-arm-pulldown", name: "Cable Pullover", subgroup: "back_lats", station: "cable", secondarySubgroups: ["serratus", "chest_lower"] },
  { slug: "seated-cable-row", strengthLevelSlug: "seated-cable-row", name: "Seated Cable Row", subgroup: "back_lats", station: "low_row", secondarySubgroups: ["back_traps", "biceps", "forearms"] },
  { slug: "single-arm-cable-row", strengthLevelSlug: "seated-cable-row", name: "Single-Arm Cable Row", subgroup: "back_lats", station: "cable", secondarySubgroups: ["biceps", "forearms"], isUnilateral: true },
  { slug: "smith-bent-over-row", strengthLevelSlug: "bent-over-row", name: "Smith Bent-Over Row", subgroup: "back_lats", station: "smith", secondarySubgroups: ["back_traps", "biceps", "forearms"] },
  { slug: "chin-up", strengthLevelSlug: "chin-ups", name: "Chin-Up", subgroup: "back_lats", station: "chin_up", secondarySubgroups: ["biceps", "forearms"], isBodyweight: true },
  { slug: "pull-up", strengthLevelSlug: "pull-ups", name: "Pull-Up", subgroup: "back_lats", station: "chin_up", secondarySubgroups: ["biceps", "forearms"], isBodyweight: true },
  // Traps
  { slug: "smith-shrug", strengthLevelSlug: "smith-machine-shrug", name: "Smith Shrug", subgroup: "back_traps", station: "smith", secondarySubgroups: ["forearms"] },
  { slug: "cable-shrug", strengthLevelSlug: "cable-shrug", name: "Cable Shrug", subgroup: "back_traps", station: "cable", secondarySubgroups: ["forearms"] },
  { slug: "cable-upright-row", strengthLevelSlug: "cable-upright-row", name: "Cable Upright Row", subgroup: "back_traps", station: "cable", secondarySubgroups: ["delts_side", "biceps"] },
  // Lower back
  { slug: "back-extension", strengthLevelSlug: "back-extension", name: "Back Extension", subgroup: "back_lower", station: "bench", secondarySubgroups: ["glutes", "hamstrings"] },
  { slug: "smith-good-morning", strengthLevelSlug: "good-morning", name: "Smith Good Morning", subgroup: "back_lower", station: "smith", secondarySubgroups: ["hamstrings", "glutes"] },
  { slug: "smith-deadlift", strengthLevelSlug: "deadlift", name: "Smith Deadlift", subgroup: "back_lower", station: "smith", secondarySubgroups: ["glutes", "hamstrings", "back_traps", "quads"] },

  // ── Shoulders ──────────────────────────────────────────────────────────
  { slug: "smith-overhead-press", strengthLevelSlug: "shoulder-press", name: "Smith Overhead Press", subgroup: "delts_front", station: "smith", secondarySubgroups: ["delts_side", "triceps"] },
  { slug: "cable-lateral-raise", strengthLevelSlug: "cable-lateral-raise", name: "Cable Lateral Raise", subgroup: "delts_side", station: "cable", isUnilateral: true },
  { slug: "cable-rear-delt-fly", strengthLevelSlug: "cable-reverse-fly", name: "Cable Rear Delt Fly", subgroup: "delts_rear", station: "cable", secondarySubgroups: ["back_traps"] },
  { slug: "cable-face-pull", strengthLevelSlug: "face-pull", name: "Cable Face Pull", subgroup: "delts_rear", station: "cable", secondarySubgroups: ["back_traps"] },
  { slug: "cable-front-raise", strengthLevelSlug: "dumbbell-front-raise", name: "Cable Front Raise", subgroup: "delts_front", station: "cable" },

  // ── Arms ───────────────────────────────────────────────────────────────
  { slug: "cable-bicep-curl", strengthLevelSlug: "cable-bicep-curl", name: "Cable Bicep Curl", subgroup: "biceps", station: "cable" },
  { slug: "cable-rope-hammer-curl", strengthLevelSlug: "cable-hammer-curl", name: "Cable Rope Hammer Curl", subgroup: "biceps", station: "cable", secondarySubgroups: ["forearms"] },
  { slug: "single-arm-cable-curl", strengthLevelSlug: "cable-bicep-curl", name: "Single-Arm Cable Curl", subgroup: "biceps", station: "cable", isUnilateral: true },
  { slug: "cable-tricep-pushdown", strengthLevelSlug: "tricep-pushdown", name: "Cable Tricep Pushdown", subgroup: "triceps", station: "cable" },
  { slug: "cable-rope-pushdown", strengthLevelSlug: "tricep-rope-pushdown", name: "Cable Rope Pushdown", subgroup: "triceps", station: "cable" },
  { slug: "cable-overhead-tricep-extension", strengthLevelSlug: "cable-overhead-tricep-extension", name: "Cable Overhead Tricep Extension", subgroup: "triceps", station: "cable" },
  // Forearms
  { slug: "cable-wrist-curl", strengthLevelSlug: "wrist-curl", name: "Cable Wrist Curl", subgroup: "forearms", station: "cable" },
  { slug: "cable-reverse-curl", strengthLevelSlug: "reverse-barbell-curl", name: "Cable Reverse Curl", subgroup: "forearms", station: "cable", secondarySubgroups: ["biceps"] },

  // ── Core ───────────────────────────────────────────────────────────────
  { slug: "cable-crunch", strengthLevelSlug: "cable-crunch", name: "Cable Crunch", subgroup: "abs", station: "cable" },
  { slug: "hanging-leg-raise", strengthLevelSlug: "hanging-leg-raise", name: "Hanging Leg Raise", subgroup: "abs", station: "chin_up", secondarySubgroups: ["obliques", "forearms"], isBodyweight: true },
  { slug: "cable-woodchop", strengthLevelSlug: "cable-woodchopper", name: "Cable Woodchop", subgroup: "obliques", station: "cable", secondarySubgroups: ["abs"], isUnilateral: true },
  { slug: "cable-side-bend", strengthLevelSlug: "dumbbell-side-bend", name: "Cable Side Bend", subgroup: "obliques", station: "cable", isUnilateral: true },
  { slug: "cable-serratus-punch", strengthLevelSlug: "cable-serratus-punch", name: "Cable Serratus Punch", subgroup: "serratus", station: "cable", secondarySubgroups: ["abs"] },

  // ── Upper legs ─────────────────────────────────────────────────────────
  { slug: "smith-squat", strengthLevelSlug: "smith-machine-squat", name: "Smith Squat", subgroup: "quads", station: "smith", secondarySubgroups: ["glutes", "hamstrings"] },
  { slug: "smith-front-squat", strengthLevelSlug: "front-squat", name: "Smith Front Squat", subgroup: "quads", station: "smith", secondarySubgroups: ["glutes"] },
  { slug: "leg-press", strengthLevelSlug: "sled-leg-press", name: "Leg Press", subgroup: "quads", station: "leg_press", secondarySubgroups: ["glutes", "hamstrings"] },
  { slug: "leg-extension", strengthLevelSlug: "leg-extension", name: "Leg Extension", subgroup: "quads", station: "leg_developer" },
  { slug: "smith-bulgarian-split-squat", strengthLevelSlug: "bulgarian-split-squat", name: "Smith Bulgarian Split Squat", subgroup: "quads", station: "smith", secondarySubgroups: ["glutes"], isUnilateral: true },
  { slug: "lying-leg-curl", strengthLevelSlug: "lying-leg-curl", name: "Lying Leg Curl", subgroup: "hamstrings", station: "leg_developer" },
  { slug: "smith-romanian-deadlift", strengthLevelSlug: "romanian-deadlift", name: "Smith Romanian Deadlift", subgroup: "hamstrings", station: "smith", secondarySubgroups: ["glutes", "back_lower"] },
  { slug: "cable-pull-through", strengthLevelSlug: "cable-pull-through", name: "Cable Pull-Through", subgroup: "glutes", station: "cable", secondarySubgroups: ["hamstrings"] },
  { slug: "smith-hip-thrust", strengthLevelSlug: "hip-thrust", name: "Smith Hip Thrust", subgroup: "glutes", station: "smith", secondarySubgroups: ["hamstrings"] },
  { slug: "cable-glute-kickback", strengthLevelSlug: "cable-kickback", name: "Cable Glute Kickback", subgroup: "glutes", station: "cable", secondarySubgroups: ["hamstrings"], isUnilateral: true },
  { slug: "smith-sumo-squat", strengthLevelSlug: "sumo-squat", name: "Smith Sumo Squat", subgroup: "glutes", station: "smith", secondarySubgroups: ["adductors", "quads", "hamstrings"] },
  // Adductors
  { slug: "cable-hip-adduction", strengthLevelSlug: "hip-adduction", name: "Cable Hip Adduction", subgroup: "adductors", station: "cable", isUnilateral: true },

  // ── Lower legs ─────────────────────────────────────────────────────────
  { slug: "smith-standing-calf-raise", strengthLevelSlug: "sled-press-calf-raise", name: "Smith Standing Calf Raise", subgroup: "calves", station: "smith" },
  { slug: "leg-press-calf-raise", strengthLevelSlug: "sled-press-calf-raise", name: "Leg Press Calf Raise", subgroup: "calves", station: "leg_press" },
  { slug: "tibialis-raise", name: "Tibialis Raise", subgroup: "tibialis", station: "bodyweight" },
];
