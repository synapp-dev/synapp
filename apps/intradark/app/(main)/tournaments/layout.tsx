import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function TournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="tournaments">{children}</NavRouteGate>;
}
