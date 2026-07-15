"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";

import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export function CaseChecklistCard({ items }: { items: ChecklistItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.done])),
  );

  const doneCount = items.filter((item) => checked[item.id]).length;
  const percent = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100);

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Case plan checklist</CardTitle>
        </div>
        <CardDescription>
          {doneCount} of {items.length} complete (demo only, resets on reload)
        </CardDescription>
        <Progress value={percent} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {items.map((item) => {
            const isDone = Boolean(checked[item.id]);
            return (
              <li key={item.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/40",
                    isDone && "text-muted-foreground",
                  )}
                >
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={(value) =>
                      setChecked((prev) => ({ ...prev, [item.id]: value === true }))
                    }
                    className="mt-0.5"
                  />
                  <span className={cn(isDone && "line-through decoration-muted-foreground/60")}>
                    {item.text}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
