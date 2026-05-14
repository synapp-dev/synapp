import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function TheoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="theory">{children}</NavRouteGate>;
}
