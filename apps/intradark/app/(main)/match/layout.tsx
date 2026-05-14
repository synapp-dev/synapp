import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function MatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="match">{children}</NavRouteGate>;
}
