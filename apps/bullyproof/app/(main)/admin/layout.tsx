import { AdminTabSwitcher } from "@/components/molecules/admin-tab-switcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Sticky Header Tab Switcher */}
      <div className="hidden xl:block sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 pb-4 mb-6">
        <AdminTabSwitcher />
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}
