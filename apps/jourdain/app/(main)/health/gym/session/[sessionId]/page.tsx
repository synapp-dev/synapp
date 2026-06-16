"use client";

import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Check, Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Spinner } from "@workspace/ui/components/spinner";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  useAddSessionExercise,
  useExercises,
  useSession,
  useUpdateSession,
} from "@/hooks/gym/use-gym";
import { SessionRunner } from "@/components/gym/session-runner";
import { ExercisePicker } from "@/components/gym/exercise-picker";

export default function GymLiveSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();

  const { data: session, isLoading } = useSession(sessionId);
  const { data: exercises } = useExercises();
  const addExercise = useAddSessionExercise(sessionId);
  const updateSession = useUpdateSession(sessionId);

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);

  const finish = async () => {
    await updateSession.mutateAsync({ status: "completed" });
    toast.success("Workout logged");
    router.push("/health/gym");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-xl font-semibold tracking-tight">{session.title}</h2>
            {session.intensity === "hard" ? (
              <Badge className="shrink-0 gap-0.5 bg-orange-500 text-[10px] text-white hover:bg-orange-500">
                <Flame className="h-2.5 w-2.5" />
                Push hard
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {(() => {
              try {
                return format(parseISO(session.performedOn), "EEEE d MMM");
              } catch {
                return session.performedOn;
              }
            })()}{" "}
            · {totalSets} set{totalSets === 1 ? "" : "s"}
            {session.status === "completed" ? " · completed" : ""}
          </p>
        </div>
        {session.status === "active" ? (
          <div className="flex shrink-0 items-center gap-2">
            <ExercisePicker
              exercises={exercises ?? []}
              onPick={(ex) => addExercise.mutate(ex.id)}
              excludeIds={session.exercises.map((e) => e.exerciseId).filter(Boolean) as string[]}
              trigger={
                <Button variant="outline">
                  <Plus className="mr-1 h-4 w-4" />
                  Add exercise
                </Button>
              }
            />
            <Button onClick={finish} disabled={updateSession.isPending}>
              <Check className="mr-1 h-4 w-4" />
              Finish
            </Button>
          </div>
        ) : null}
      </div>

      {session.exercises.length > 0 ? (
        <SessionRunner session={session} sessionId={sessionId} />
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No exercises yet — add your first above.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
