import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="teams">{children}</NavRouteGate>;
}
