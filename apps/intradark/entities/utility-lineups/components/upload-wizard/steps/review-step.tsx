"use client";

import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import { useUploadWizard } from "../upload-wizard-context";

export function ReviewStep() {
  const { description, setDescription } = useUploadWizard();

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="lineup-desc">Description</Label>
        <Textarea
          id="lineup-desc"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="How to line this up, lineup name, tips…"
        />
      </div>
    </div>
  );
}
