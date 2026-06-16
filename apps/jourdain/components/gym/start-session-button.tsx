"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Gauge, Play } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { Button } from "@workspace/ui/components/button";
import { useStartSession } from "@/hooks/gym/use-gym";
import type { SessionIntensity } from "@/entities/gym/model/types";

/**
 * Start button that first asks for the session intensity (mobile bottom-sheet),
 * then creates the session and navigates into it. Used wherever a workout is
 * kicked off — Today and Programs.
 */
export function StartSessionButton({
  programId,
  exerciseIds,
  label = "Start",
  className,
  size = "sm",
}: {
  programId?: string;
  exerciseIds?: string[];
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const router = useRouter();
  const startSession = useStartSession();
  const [open, setOpen] = useState(false);

  const begin = async (intensity: SessionIntensity) => {
    const session = await startSession.mutateAsync({
      programId: programId ?? null,
      exerciseIds,
      intensity,
    });
    setOpen(false);
    router.push(`/health/gym/session/${session.id}`);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size={size} className={className} disabled={startSession.isPending}>
          <Play className="mr-1 h-4 w-4" />
          {label}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle>How hard today?</DrawerTitle>
            <DrawerDescription>Sets how the app suggests your loads this session.</DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-2 p-4">
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 py-3"
              onClick={() => begin("normal")}
              disabled={startSession.isPending}
            >
              <Gauge className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="text-left">
                <span className="block font-medium">Normal</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Steady progression — add a rep, then weight.
                </span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 py-3"
              onClick={() => begin("hard")}
              disabled={startSession.isPending}
            >
              <Flame className="h-5 w-5 shrink-0 text-orange-500" />
              <span className="text-left">
                <span className="block font-medium">Push hard</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Bigger jumps — go for a PR.
                </span>
              </span>
            </Button>
          </div>
          <DrawerFooter className="pt-0" />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
