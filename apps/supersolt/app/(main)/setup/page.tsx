import { Suspense } from "react";
import { SetupWizardClient } from "./_components/setup-wizard-client";

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-12 text-muted-foreground">
          Loading…
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <SetupWizardClient />
      </div>
    </Suspense>
  );
}
