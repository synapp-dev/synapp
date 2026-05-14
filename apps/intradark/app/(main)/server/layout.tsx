import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function ServerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="server">{children}</NavRouteGate>;
}
