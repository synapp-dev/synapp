import { SchoolStoreProviderWrapper } from "@/components/atoms/school-store-provider-wrapper";

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
    <>
      {/* School Store Provider - populates the store with school data */}
      <SchoolStoreProviderWrapper slug={slug} />
      {children}
    </>
  );
}
