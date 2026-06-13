"use client";

import { Suspense } from "react";
import { InvoicesShell } from "./invoices-shell";

type InvoicesPageClientProps = {
  organisation: string;
  venue: string;
};

function InvoicesPageClientInner({ organisation, venue }: InvoicesPageClientProps) {
  return <InvoicesShell organisation={organisation} venue={venue} />;
}

export function InvoicesPageClient({ organisation, venue }: InvoicesPageClientProps) {
  return (
    <Suspense fallback={null}>
      <InvoicesPageClientInner organisation={organisation} venue={venue} />
    </Suspense>
  );
}
