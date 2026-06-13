"use client";

import { Button } from "@workspace/ui/components/button";
import { useOptionalInventorySetupImport } from "@/entities/inventory-setup/components/inventory-setup-import-provider";
import { computeImportJobPercent } from "@/entities/inventory-setup/lib/import-job-progress";

export function InventorySetupImportHeaderButton() {
  const importContext = useOptionalInventorySetupImport();
  if (!importContext) {
    return null;
  }

  const job = importContext.activeJob;
  const percent = computeImportJobPercent(job);

  if (!importContext.isImportInProgress || importContext.dialogOpen) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="relative h-9 overflow-hidden border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_35%,var(--border))] px-3"
      onClick={importContext.openDialog}
      aria-label={`Importing from Xero, ${percent}% complete. Click to view progress.`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-[var(--brand-supersolt-primary)] transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
      <span className="relative z-10 flex items-center gap-2 text-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_12%,#0f2417)]">
        <span className="text-sm font-medium">Importing from Xero</span>
        <span className="text-xs font-medium tabular-nums">{percent}%</span>
      </span>
    </Button>
  );
}
