import { describe, expect, it } from "vitest";
import { buildWorkout, type WorkoutCandidate } from "./workout";

// A pool covering every PPL muscle block with a couple of options each.
const POOL: WorkoutCandidate[] = [
  // push
  { name: "Smith Incline Bench Press", subgroup: "chest_upper", station: "smith" },
  { name: "Cable Chest Press", subgroup: "chest_middle", station: "cable" },
  { name: "Cable Crossover", subgroup: "chest_lower", station: "cable" },
  { name: "Smith Overhead Press", subgroup: "delts_front", station: "smith" },
  { name: "Cable Lateral Raise", subgroup: "delts_side", station: "cable" },
  { name: "Cable Tricep Pushdown", subgroup: "triceps", station: "cable" },
  { name: "Cable Overhead Extension", subgroup: "triceps", station: "cable" },
  // pull
  { name: "Lat Pulldown", subgroup: "back_lats", station: "lat_pulldown" },
  { name: "Seated Cable Row", subgroup: "back_lats", station: "low_row" },
  { name: "Cable Shrug", subgroup: "back_traps", station: "cable" },
  { name: "Cable Rear Delt Fly", subgroup: "delts_rear", station: "cable" },
  { name: "Cable Bicep Curl", subgroup: "biceps", station: "cable" },
  { name: "Cable Hammer Curl", subgroup: "biceps", station: "cable" },
  // legs
  { name: "Leg Press", subgroup: "quads", station: "leg_press" },
  { name: "Leg Extension", subgroup: "quads", station: "leg_developer" },
  { name: "Leg Curl", subgroup: "hamstrings", station: "leg_developer" },
  { name: "Cable Pull-Through", subgroup: "glutes", station: "cable" },
  { name: "Standing Calf Raise", subgroup: "calves", station: "smith" },
];

describe("buildWorkout", () => {
  it("covers every block of a push day with no duplicates", () => {
    const workout = buildWorkout(POOL, "push");
    expect(workout).not.toBeNull();
    const blocks = new Set(workout!.exercises.map((e) => e.blockLabel));
    expect(blocks).toEqual(new Set(["Chest", "Shoulders", "Triceps"]));

    const names = workout!.exercises.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("only draws exercises that belong to the focus", () => {
    const workout = buildWorkout(POOL, "legs")!;
    const legGroups = new Set(["upper_legs", "lower_legs"]);
    for (const ex of workout.exercises) {
      expect(legGroups.has(ex.group)).toBe(true);
    }
  });

  it("gives compound stations more sets at lower reps than accessories", () => {
    const workout = buildWorkout(
      [{ name: "Leg Press", subgroup: "quads", station: "leg_press" }],
      "legs"
    )!;
    expect(workout.exercises[0]).toMatchObject({ sets: 4, repMin: 6, repMax: 10 });

    const accessory = buildWorkout(
      [{ name: "Cable Lateral Raise", subgroup: "delts_side", station: "cable" }],
      "push"
    )!;
    expect(accessory.exercises[0]).toMatchObject({
      sets: 3,
      repMin: 10,
      repMax: 15,
    });
  });

  it("returns null when nothing in the pool fits the focus", () => {
    const chestOnly: WorkoutCandidate[] = [
      { name: "Cable Chest Press", subgroup: "chest_middle", station: "cable" },
    ];
    expect(buildWorkout(chestOnly, "legs")).toBeNull();
  });
});
