import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function ScrimsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="scrims">{children}</NavRouteGate>;
}
