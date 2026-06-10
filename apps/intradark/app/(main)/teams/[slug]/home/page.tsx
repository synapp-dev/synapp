import { notFound } from "next/navigation";

import { TeamRoster } from "@/entities/teams/components/team-roster";
import { getTeamBySlug, getTeamRoster } from "@/entities/teams/lib/queries";

export const dynamic = "force-dynamic";

export default async function TeamHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await getTeamBySlug(decodeURIComponent(slug));
  if (!team) notFound();

  const roster = await getTeamRoster(team.id);

  return <TeamRoster members={roster} />;
}
