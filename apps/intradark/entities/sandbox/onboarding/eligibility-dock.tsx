"use client";

import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import type { EligibilityState } from "./fixtures";

const OPTIONS: { id: EligibilityState; label: string }[] = [
  { id: "not-signed-in", label: "Not signed in" },
  { id: "steam-only", label: "Steam only" },
  { id: "discord-only", label: "Discord only" },
  { id: "both-linked-not-banned", label: "Ready (Steam + Discord)" },
  { id: "banned", label: "Banned" },
  { id: "cooldown-active", label: "Queue cooldown" },
];

export function EligibilityDock({
  value,
  onChange,
}: {
  value: EligibilityState;
  onChange: (v: EligibilityState) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Eligibility preview (dashboard step)</Label>
      <Select value={value} onValueChange={(v) => onChange(v as EligibilityState)}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Eligibility" />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.id} value={o.id} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
