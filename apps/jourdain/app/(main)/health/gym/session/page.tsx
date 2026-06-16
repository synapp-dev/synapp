"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { useActiveSession, useExercises, useStartSession } from "@/hooks/gym/use-gym";

export default function GymSessionIndexPage() {
  const router = useRouter();
  const { data: active, isLoading } = useActiveSession();
  const { data: exercises } = useExercises();
  const startSession = useStartSession();

  // Jump straight into an in-progress workout when there is one.
  useEffect(() => {
    if (active) router.replace(`/health/gym/session/${active.id}`);
  }, [active, router]);

  const startEmpty = async () => {
    const session = await startSession.mutateAsync({ title: "Workout" });
    router.push(`/health/gym/session/${session.id}`);
  };

  if (isLoading || active) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <Dumbbell className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">No workout in progress</p>
            <p className="text-sm text-muted-foreground">
              Start one from a program, or begin an empty session and add exercises as you go.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button asChild>
              <Link href="/health/gym/programs">Start from a program</Link>
            </Button>
            <Button
              variant="outline"
              onClick={startEmpty}
              disabled={startSession.isPending || (exercises ?? []).length === 0}
            >
              Start empty session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
