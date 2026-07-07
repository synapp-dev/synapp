"use client";

import { HeartHandshake } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  isTouchOverdue,
  lastTouchLabel,
  personInitials,
} from "@/components/molecules/person-card";
import { usePeople, useUpdatePerson } from "@/hooks/people/use-people";

/** People whose regular catch-up is overdue, with a one-tap "Log touch". */
export function TouchBaseCard() {
  const { data: people } = usePeople();
  const updatePerson = useUpdatePerson();
  const due = (people ?? []).filter((person) => isTouchOverdue(person));

  if (due.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartHandshake className="h-4 w-4 text-muted-foreground" />
          Touch base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {due.map((person) => (
          <div
            key={person.id}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {personInitials(person)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                {person.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                Last contact {lastTouchLabel(person)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={() =>
                updatePerson.mutate({
                  personId: person.id,
                  input: { lastTouchAt: new Date().toISOString() },
                })
              }
            >
              Log touch
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
