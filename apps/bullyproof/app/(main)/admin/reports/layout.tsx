import { Suspense, type ReactNode } from "react";
import { ReportsLayoutClient } from "@/entities/dashboard/ui/admin/sections/reports/reports-layout-shell";

export default function AdminReportsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <ReportsLayoutClient>{children}</ReportsLayoutClient>
    </Suspense>
  );
}
