import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function PlayersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="players">{children}</NavRouteGate>;
}
