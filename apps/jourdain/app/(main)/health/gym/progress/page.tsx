"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMeStore } from "@/entities/me/model/store";
import { Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { GymHeaderActions } from "@/components/organisms/gym-header";
import {
  useBodyWeights,
  useDemoData,
  useExerciseBests,
  useExercises,
  useStandards,
} from "@/hooks/gym/use-gym";
import { BodyMap } from "@/components/gym/body-map";
import { StrengthScorePanel } from "@/components/gym/strength-score-panel";
import { ExerciseCarousel } from "@/components/gym/exercise-carousel";
import { rateMuscles } from "@/lib/gym/strength-rating";
import {
  GROUP_SUBGROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_SUBGROUPS,
  MUSCLE_SUBGROUP_LABELS,
  SUBGROUP_TO_GROUP,
  type Exercise,
  type LiftStanding,
  type MuscleGroup,
  type MuscleSubgroup,
  type Sex,
} from "@/entities/gym/model/types";

export default function GymProgressPage() {
  const { data: exercises } = useExercises();
  const { data: standards } = useStandards();
  const { data: bodyWeights } = useBodyWeights();
  const { data: bests } = useExerciseBests();
  const demo = useDemoData();
  // Selection is two-level: a whole group, optionally drilled into one subgroup.
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [selectedSub, setSelectedSub] = useState<MuscleSubgroup | null>(null);
  // Clicking a group selects the whole group (no auto-picked subgroup); clicking
  // it again clears it. Drilling into a subgroup narrows within the group.
  const toggleGroup = (g: MuscleGroup) => {
    if (selectedGroup === g && selectedSub == null) {
      setSelectedGroup(null);
    } else {
      setSelectedGroup(g);
      setSelectedSub(null);
    }
  };
  const toggleSub = (sub: MuscleSubgroup) => {
    if (selectedSub === sub) {
      setSelectedSub(null); // back to the whole group
    } else {
      setSelectedSub(sub);
      setSelectedGroup(SUBGROUP_TO_GROUP[sub]);
    }
  };
  const [hoveredGroup, setHoveredGroup] = useState<MuscleGroup | null>(null);
  // Subgroups lit up while hovering the focused exercise card (its target muscles).
  const [hoverExerciseSubs, setHoverExerciseSubs] = useState<Set<MuscleSubgroup> | null>(null);
  const handleHoverExercise = (ex: Exercise | null) =>
    setHoverExerciseSubs(
      ex ? new Set([ex.subgroup, ...(ex.secondarySubgroups ?? [])]) : null,
    );
  // The body-map intro plays first; once it reveals real colours it flips this,
  // which kicks off the staggered count-up of the strength bars beside it.
  const [statsReady, setStatsReady] = useState(false);
  // The carousel only comes in once the user picks a group/muscle for the first
  // time. Latched: once they've interacted it stays (it doesn't leave on
  // deselect) — the body + stats just start out larger until that first pick.
  const [hasInteracted, setHasInteracted] = useState(false);
  useEffect(() => {
    if (selectedGroup != null || selectedSub != null) setHasInteracted(true);
  }, [selectedGroup, selectedSub]);
  // Sex drives the strength-standard benchmarks; it comes from the user profile.
  const sex: Sex = useMeStore((s) => s.currentUser?.sex) ?? "male";

  const bodyweight = bodyWeights?.[0]?.weightKg ?? null;
  const list = useMemo(() => exercises ?? [], [exercises]);
  const activeExercises = useMemo(
    () => list.filter((e) => !e.archived),
    [list],
  );

  // Strength level vs benchmarks — drives the muscle map colours & ratings.
  const rating = useMemo(
    () => rateMuscles({ exercises: list, standards, bests, bodyweight, sex }),
    [list, standards, bests, bodyweight, sex],
  );
  const subStandings = useMemo(() => {
    const out = {} as Record<MuscleSubgroup, LiftStanding>;
    for (const sg of MUSCLE_SUBGROUPS) out[sg] = rating.bySubgroup[sg].standing;
    return out;
  }, [rating]);
  if (list.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Load your exercise library and log a few sessions to see your muscle
            map.
          </CardContent>
        </Card>
      </div>
    );
  }

  const anySelected = selectedGroup != null || selectedSub != null;
  // Groups the hovered exercise works — dims the unrelated strength bars.
  const hoverGroups = hoverExerciseSubs
    ? new Set([...hoverExerciseSubs].map((s) => SUBGROUP_TO_GROUP[s]))
    : null;
  // Muscles that light up AND flash on the body: a hovered exercise's targets,
  // otherwise a whole selected group (a single selected subgroup pulses on its own).
  const flashSubs =
    hoverExerciseSubs ??
    (selectedGroup && !selectedSub
      ? new Set<MuscleSubgroup>(GROUP_SUBGROUPS[selectedGroup])
      : null);

  // The exercises carousel. Nothing selected → every exercise (focused on the
  // middle card). A subgroup selected → just that muscle's exercises. A whole
  // group selected → every exercise across all of the group's subgroups. The
  // key remounts on selection change so the focus + start animation reset.
  const carouselExercises = selectedSub
    ? activeExercises.filter(
        (e) =>
          e.subgroup === selectedSub ||
          e.secondarySubgroups?.includes(selectedSub),
      )
    : selectedGroup
      ? activeExercises.filter(
          (e) =>
            SUBGROUP_TO_GROUP[e.subgroup] === selectedGroup ||
            e.secondarySubgroups?.some(
              (s) => SUBGROUP_TO_GROUP[s] === selectedGroup,
            ),
        )
      : activeExercises;
  const carouselStart = anySelected
    ? 0
    : Math.floor(carouselExercises.length / 2);
  const exercisesCard =
    carouselExercises.length > 0 ? (
      <ExerciseCarousel
        key={selectedSub ?? selectedGroup ?? "all"}
        exercises={carouselExercises}
        startIndex={carouselStart}
        standards={standards}
        bests={bests}
        bodyweight={bodyweight}
        sex={sex}
        onHoverExercise={handleHoverExercise}
      />
    ) : (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {selectedSub
          ? `No exercises tagged to ${MUSCLE_SUBGROUP_LABELS[selectedSub]} yet.`
          : selectedGroup
            ? `No exercises for ${MUSCLE_GROUP_LABELS[selectedGroup]} yet.`
            : "No exercises yet."}
      </p>
    );

  return (
    // Top-pinned (not vertically centred) so selecting a muscle — which grows
    // the exercises lane — never repositions the body or stats. The pt gives
    // breathing room from the header.
    <div className="mx-auto flex min-h-[calc(100svh-9rem)] w-full max-w-7xl flex-col pt-[4vh]">
      <GymHeaderActions>
        <Button
          size="sm"
          variant="outline"
          onClick={() => demo.mutate("generate")}
          disabled={demo.isPending}
        >
          <Sparkles className="mr-1 h-4 w-4" />
          Demo data
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => demo.mutate("clear")}
          disabled={demo.isPending}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Clear
        </Button>
      </GymHeaderActions>

      {/* Top row: body + strength bars. Before the first selection it sits a
          notch larger to own the screen; the first pick shrinks it to its
          settled size, opening room below for the carousel. */}
      <div
        className={`flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-center w-full origin-top transition-transform duration-700 ease-out ${
          hasInteracted ? "lg:scale-100" : "lg:scale-[1.18]"
        }`}
      >
        {/* Body map — keeps the same size throughout; it's centre-stage during
            the intro, then framer layout slides it aside (no resize) once the
            strength bars mount. */}
        <motion.div
          layout
          className="relative w-full max-w-sm lg:max-w-none lg:w-1/4 lg:shrink-0"
        >
          <BodyMap
            subStandings={subStandings}
            selectedSubgroup={selectedSub}
            highlightGroup={hoveredGroup}
            highlightSubgroups={flashSubs}
            onSelect={(subgroup) => {
              if (selectedSub === subgroup) {
                setSelectedSub(null);
                setSelectedGroup(null);
              } else {
                setSelectedSub(subgroup);
                setSelectedGroup(SUBGROUP_TO_GROUP[subgroup]);
              }
            }}
            onGroupHover={setHoveredGroup}
            onReveal={() => setStatsReady(true)}
          />
        </motion.div>

        {/* Strength bars — raw (no card), mount once the intro hands off. Fixed
            height in the overview (Overall pinned to the bottom); drops the
            height when a group is selected so it shrinks to fit. */}
        {statsReady ? (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className={`w-full lg:w-1/4 lg:shrink-0 ${anySelected ? "" : "lg:w-1/2"}`}
          >
            <StrengthScorePanel
              byGroup={rating.byGroup}
              bySubgroup={rating.bySubgroup}
              selectedGroup={selectedGroup}
              selectedSubgroup={selectedSub}
              onSelectGroup={toggleGroup}
              onSelectSubgroup={toggleSub}
              onGroupHover={setHoveredGroup}
              hoveredGroup={hoveredGroup}
              highlightGroups={hoverGroups}
              focusSubgroups={hoverExerciseSubs}
            />
          </motion.div>
        ) : null}
      </div>

      {/* Exercises — horizontal carousel below the top row. Comes in on the
          first group/muscle pick and stays (even on deselect); shows every
          exercise (focused on the middle card) when nothing is selected. */}
      {hasInteracted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="mt-8 w-full"
        >
          {exercisesCard}
        </motion.div>
      ) : null}
    </div>
  );
}
