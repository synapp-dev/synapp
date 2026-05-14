import { NavRouteGate } from "@/entities/rbac/components/nav-route-gate";

export default function WatchlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavRouteGate segment="watchlist">{children}</NavRouteGate>;
}
