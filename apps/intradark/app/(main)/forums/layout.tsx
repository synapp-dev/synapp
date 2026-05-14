import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export const dynamic = "force-dynamic";

export default function ForumsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="forums">{children}</NavRouteGate>;
}