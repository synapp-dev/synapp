import { createServerClient } from "@/utils/supabase/server";
import { HeaderTabSwitcher } from "@/components/molecules/header-tab-switcher";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school_id: string }>;
}) {
  const supabase = await createServerClient();
  const { school_id } = await params;
  const slug = school_id;

  const { data: school, error } = await supabase
    .from("schools")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 pb-4">
        <div className="space-y-4">
          <Card className="w-full h-fit">
            <CardHeader>
              <CardTitle className="text-4xl font-extrabold">
                {school?.name ?? slug}
              </CardTitle>
            </CardHeader>
          </Card>
          <HeaderTabSwitcher schoolSlug={slug} />
        </div>
      </div>
      {children}
    </div>
  );
}
