import { describe, expect, it } from "vitest";
import { generateSmartSession } from "./smart-fill";
import type { Exercise, MuscleGroup, MuscleSubgroup } from "@/entities/gym/model/types";
import type { Assessment } from "./muscle-status";

const CHEST_SUBS: MuscleSubgroup[] = ["chest_upper", "chest_middle", "chest_lower"];

function ex(id: string, subgroup: MuscleSubgroup, group: MuscleGroup): Exercise {
  return {
    id,
    slug: id,
    name: id,
    subgroup,
    group,
    secondarySubgroups: [],
    station: "cable",
    strengthLevelSlug: null,
    isUnilateral: false,
    isBodyweight: false,
    isFavourite: false,
    isCustom: false,
    archived: false,
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
}

function assess(score: number): Assessment {
  return {
    status: "behind",
    score,
    weeklySets: 0,
    targetSets: 8,
    volume: 0,
    lastTrained: null,
    staleDays: 0,
    progression: null,
  };
}

const exercises = [
  ex("a", "chest_upper", "chest"),
  ex("a2", "chest_upper", "chest"),
  ex("b", "chest_middle", "chest"),
  ex("c", "triceps", "arms"),
];
const assessments = {
  chest_upper: assess(10),
  chest_middle: assess(80),
  triceps: assess(50),
} as unknown as Record<MuscleSubgroup, Assessment>;

describe("generateSmartSession", () => {
  it("prioritises the most-behind chosen subgroup", () => {
    const picks = generateSmartSession({ subgroups: CHEST_SUBS, exercises, assessments, size: 1 });
    expect(picks[0]!.subgroup).toBe("chest_upper");
  });

  it("only picks exercises whose primary subgroup is targeted (chest, not triceps)", () => {
    const picks = generateSmartSession({ subgroups: CHEST_SUBS, exercises, assessments, size: 5 });
    expect(picks.every((p) => p.exerciseId !== "c")).toBe(true);
  });

  it("can target a single subgroup like triceps without pulling in biceps", () => {
    const withArms = [...exercises, ex("d", "biceps", "arms")];
    const picks = generateSmartSession({
      subgroups: ["triceps"],
      exercises: withArms,
      assessments: { ...assessments, triceps: assess(20) } as unknown as Record<MuscleSubgroup, Assessment>,
      size: 5,
    });
    expect(picks.every((p) => p.subgroup === "triceps")).toBe(true);
    expect(picks.some((p) => p.exerciseId === "c")).toBe(true);
  });

  it("prefers favourites among equally-fresh candidates", () => {
    const exs = [
      ex("plain", "chest_upper", "chest"),
      { ...ex("fav", "chest_upper", "chest"), isFavourite: true },
    ];
    const a = {
      chest_upper: assess(50),
      chest_middle: assess(50),
      chest_lower: assess(50),
    } as unknown as Record<MuscleSubgroup, Assessment>;
    const picks = generateSmartSession({ subgroups: ["chest_upper"], exercises: exs, assessments: a, size: 1 });
    expect(picks[0]!.exerciseId).toBe("fav");
  });

  it("rotates away from recently-done exercises", () => {
    const picks = generateSmartSession({
      subgroups: CHEST_SUBS,
      exercises,
      assessments,
      recentExerciseIds: ["a"],
      size: 1,
    });
    expect(picks[0]!.exerciseId).toBe("a2");
  });

  it("returns nothing when no subgroups are chosen", () => {
    expect(generateSmartSession({ subgroups: [], exercises, assessments })).toEqual([]);
  });
});
