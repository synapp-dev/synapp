import { HeaderTabSwitcher } from "@/components/molecules/header-tab-switcher";
import { SchoolStoreProviderWrapper } from "@/components/atoms/school-store-provider-wrapper";
import { SchoolCard } from "@/components/molecules/school-card";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const slug = school_id;

  return (
    <div>
      {/* School Store Provider - populates the store with school data */}
      <SchoolStoreProviderWrapper slug={slug} />

      {/* School Card - reads from store */}
      <SchoolCard />

      {/* Sticky Header Tab Switcher */}
      <div className="hidden xl:block sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 pb-4 mb-6">
        <HeaderTabSwitcher schoolSlug={slug} />
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}
