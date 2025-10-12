import { SupportTabSwitcher } from "@/components/molecules/support-tab-switcher";

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Sticky Header Tab Switcher */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 pb-4 mb-6">
        <SupportTabSwitcher />
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}
