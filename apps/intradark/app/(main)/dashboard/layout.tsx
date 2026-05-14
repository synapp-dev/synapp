import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="dashboard">{children}</NavRouteGate>;
}
