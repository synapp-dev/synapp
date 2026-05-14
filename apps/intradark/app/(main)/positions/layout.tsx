import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function PositionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="positions">{children}</NavRouteGate>;
}
