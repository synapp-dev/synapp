import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { Tables } from "@/types/supabase";
import { api } from "@/lib/api/client";

export default async function SchoolsPage() {
  const { data: schools, error } = await api.get.schools();

  if (error) {
    return <div>Error loading schools: {error.message}</div>;
  }

  const schoolList = (schools as Tables<"schools">[] | null) ?? [];

  // culture rating
  // ahead or behind schedule
  // progress bar indicator

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Schools</h1>
      <div className="grid grid-cols-2 gap-4">
        {schoolList.map((school) => (
          <Card key={school.id}>
            <CardHeader>
              <CardTitle>{school.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{school.address}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
