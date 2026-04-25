import { Suspense } from "react";
import { SetupWizardClient } from "./_components/setup-wizard-client";

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading…</div>}>
      <SetupWizardClient />
    </Suspense>
  );
}
