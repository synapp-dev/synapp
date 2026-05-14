import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="play">{children}</NavRouteGate>;
}
