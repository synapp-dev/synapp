import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export const dynamic = "force-dynamic";

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="news">{children}</NavRouteGate>;
}