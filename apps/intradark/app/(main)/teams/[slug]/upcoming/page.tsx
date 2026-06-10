import { notFound } from "next/navigation";

import { getTeamBySlug } from "@/entities/teams/lib/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export const dynamic = "force-dynamic";

export default async function TeamUpcomingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await getTeamBySlug(decodeURIComponent(slug));
  if (!team) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming</CardTitle>
        <CardDescription>
          Schedule and scrims for {team.name} — coming soon.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Match scheduling and team events will appear here in a future update.
        </p>
      </CardContent>
    </Card>
  );
}
