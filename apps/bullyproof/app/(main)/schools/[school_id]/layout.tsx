import { SchoolStoreProviderWrapper } from "@/components/atoms/school-store-provider-wrapper";
import { SchoolPageTutorialGuard } from "@/components/molecules/school-page-tutorial-guard";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  // Route param is always a SchoolSlug — see CONTEXT.md
  const slug = school_id;

  return (
    <>
      {/* School Store Provider - populates the store with school data */}
      <SchoolStoreProviderWrapper slug={slug} />
      {/* Tutorial Guard - shows tutorials on first visit to school pages */}
      <SchoolPageTutorialGuard />
      {children}
    </>
  );
}
