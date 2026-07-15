import { Suspense } from "react";
import { SalesTabsNav } from "@/entities/sales-insights/components/sales-tabs-nav";

export default async function SalesInsightsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organisation: string; venue: string }>;
}) {
  const { organisation, venue } = await params;

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <SalesTabsNav organisation={organisation} venue={venue} />
      </Suspense>
      {children}
    </div>
  );
}
