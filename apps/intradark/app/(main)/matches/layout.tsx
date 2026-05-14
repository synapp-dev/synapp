import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function MatchesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="matches">{children}</NavRouteGate>;
}
