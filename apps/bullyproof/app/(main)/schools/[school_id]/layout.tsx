import { schoolServerApi } from "@/entities/school/api/server-endpoints";
import { HeaderTabSwitcher } from "@/components/molecules/header-tab-switcher";
import { SchoolStoreProvider } from "@/components/atoms/school-store-provider";
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card";
import Image from "next/image";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const slug = school_id;

  const { data: school, error } = await schoolServerApi.get.schoolBySlug(slug);

  if (error) {
    return <div>Error loading school: {error.message}</div>;
  }

  return (
    <div>
      {/* School Store Provider - populates the store with school data */}
      <SchoolStoreProvider
        school={{
          id: school?.id ?? "",
          name: school?.name ?? "",
          slug: school?.slug ?? slug,
          bannerUrl: school?.bannerUrl ?? "",
          avatarUrl: school?.avatarUrl ?? "",
        }}
      />

      {/* School Card - not sticky */}
      <div className="mb-4">
        <Card className="w-full h-fit py-12 relative">
          {school?.bannerUrl && (
            <div className="absolute inset-0 z-0">
              <Image
                src={school?.bannerUrl ?? ""}
                alt={school?.name ?? ""}
                width={1000}
                height={1000}
                className="object-cover w-full h-full overflow-hidden rounded-xl opacity-20"
              />
            </div>
          )}
          <CardHeader className="z-10">
            <CardTitle className="text-4xl font-extrabold flex items-center gap-2">
              {school?.avatarUrl && (
                <Image
                  src={school?.avatarUrl ?? ""}
                  alt={school?.name ?? ""}
                  width={100}
                  height={100}
                  className="w-10 h-auto"
                />
              )}
              {school?.name}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Sticky Header Tab Switcher */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 pb-4 mb-6">
        <HeaderTabSwitcher schoolSlug={slug} />
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}
