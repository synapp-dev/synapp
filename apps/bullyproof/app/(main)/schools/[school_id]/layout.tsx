import { createServerClient } from "@/utils/supabase/server";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { school_id: string };
}) {
  const supabase = await createServerClient();
  const slug = params.school_id;

  const { data: school, error } = await supabase
    .from("schools")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md border">
            <span className="text-xs">🏫</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold">
              {school?.name ?? slug}
            </span>
            {school?.sector_id ? (
              <span className="text-xs text-muted-foreground">
                {school.sector_id}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}