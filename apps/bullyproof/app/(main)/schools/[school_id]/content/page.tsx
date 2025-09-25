import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { createServerClient } from "@/utils/supabase/server";

export default async function ContentPage() {
  const supabase = await createServerClient();

  const { data: v_curriculum_stages_years, error } = await supabase
    .from("v_curriculum_stages_years")
    .select("*");

  return (
    <div>
      {error && <div className="text-red-600">{error.message}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(v_curriculum_stages_years ?? [])
          .slice()
          .sort(
            (a: any, b: any) =>
              (a?.min_sort_index ?? 0) - (b?.min_sort_index ?? 0)
          )
          .slice(0, 5)
          .map((stage: any) => (
            <Card key={stage.stage_id}>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stage.stage_name}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(stage.year_names ?? []).map((name: string) => (
                        <Badge key={name} variant="secondary">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardTitle>
                <CardDescription></CardDescription>
              </CardHeader>
            </Card>
          ))}
      </div>
    </div>
  );
}
