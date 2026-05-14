import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="media">{children}</NavRouteGate>;
}
