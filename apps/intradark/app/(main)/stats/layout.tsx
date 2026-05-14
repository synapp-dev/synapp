import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="stats">{children}</NavRouteGate>;
}
