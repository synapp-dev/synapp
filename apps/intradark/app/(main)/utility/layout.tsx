import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export const dynamic = "force-dynamic";

export default function UtilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="utility">{children}</NavRouteGate>;
}