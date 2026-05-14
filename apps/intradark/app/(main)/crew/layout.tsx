import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function CrewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="crew">{children}</NavRouteGate>;
}
