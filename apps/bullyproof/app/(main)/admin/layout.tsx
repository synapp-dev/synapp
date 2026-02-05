import { AdminRouteGuard } from "./components/admin-route-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRouteGuard>
      <div>
        {/* Page Content */}
        <div>{children}</div>
      </div>
    </AdminRouteGuard>
  );
}
