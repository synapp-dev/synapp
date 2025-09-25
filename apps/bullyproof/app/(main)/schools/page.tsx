import { createServerClient } from "@/utils/supabase/server";
import { Card, CardHeader, CardTitle } from "@workspace/ui/components/card";
import type { Tables } from "@/types/supabase";

export default async function SchoolsPage() {
  const supabase = await createServerClient();
  const { data: schools, error } = await supabase.from("schools").select("*");

  if (error) {
    return <div>Error loading schools: {error.message}</div>;
  }

  const schoolList = (schools as Tables<"schools">[] | null) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Schools</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {schoolList.map((school) => (
          <Card key={school.id}>
            <CardHeader>
              <CardTitle>{school.name}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
