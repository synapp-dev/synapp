"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { apiFetch } from "@/lib/api/fetcher.client";

type PurchasingSettings = {
  defaultBufferPercent: number;
  poApprovalThresholdCents: number;
  gstTreatment: string;
  poEmailTemplate: string | null;
};

const PLACEHOLDERS =
  "{{supplier_name}} {{venue_name}} {{organisation_name}} {{po_number}} {{lines}} {{total_ex_gst}} {{total_inc_gst}} {{notes}}";

export function PurchasingSettingsCard({
  organisation,
}: {
  organisation: string;
}) {
  const settingsQuery = useQuery({
    queryKey: ["purchasing-settings", organisation],
    queryFn: async () => {
      const result = await apiFetch<PurchasingSettings>(
        `/organisations/${organisation}/purchasing-settings`,
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });

  const [thresholdDollars, setThresholdDollars] = useState("");
  const [template, setTemplate] = useState("");

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setThresholdDollars((settings.poApprovalThresholdCents / 100).toFixed(2));
    setTemplate(settings.poEmailTemplate ?? "");
  }, [settingsQuery.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const thresholdCents = Math.round(Number(thresholdDollars) * 100);
      if (!Number.isFinite(thresholdCents) || thresholdCents < 0) {
        throw new Error("Enter a valid approval threshold");
      }
      const result = await apiFetch<PurchasingSettings>(
        `/organisations/${organisation}/purchasing-settings`,
        {
          method: "PATCH",
          body: JSON.stringify({
            poApprovalThresholdCents: thresholdCents,
            poEmailTemplate: template.trim() ? template : null,
          }),
        },
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Purchasing settings saved");
      void settingsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    },
  });

  if (settingsQuery.isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Loading purchasing settings…</p>
    );
  }
  if (settingsQuery.isError) {
    return (
      <p className="text-muted-foreground text-sm">
        Could not load purchasing settings.
      </p>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="po-approval-threshold">PO approval threshold ($)</Label>
        <Input
          id="po-approval-threshold"
          type="number"
          min="0"
          step="0.01"
          className="max-w-[180px]"
          value={thresholdDollars}
          onChange={(e) => setThresholdDollars(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          POs at or above this total need org-admin approval before they send.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="po-email-template">PO email template</Label>
        <Textarea
          id="po-email-template"
          className="min-h-[160px] font-mono text-xs"
          placeholder="Leave blank to use the default email body."
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Available placeholders:{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{PLACEHOLDERS}</code>
        </p>
      </div>

      <Button
        type="button"
        disabled={saveMut.isPending}
        onClick={() => saveMut.mutate()}
      >
        {saveMut.isPending ? "Saving…" : "Save purchasing settings"}
      </Button>
    </div>
  );
}
