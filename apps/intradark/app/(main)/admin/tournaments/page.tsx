import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { hasCapability } from "@/entities/admin/lib/role-slugs";
import { ROLE_TOURNAMENT_ADMIN } from "@/entities/admin/lib/rbac-constants";
import { CreateCompetitionWizard } from "@/entities/tournament/components/create-competition-wizard";
import { FormatBadge, SeasonStatusBadge } from "@/entities/tournament/components/format-badge";
import { listCompetitions } from "@/entities/tournament/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminTournamentsPage() {
  const userId = await getSessionUserId();
  if (!userId) notFound();
  const slugs = await getEffectiveRoleSlugsForUser(userId);
  if (!hasCapability(slugs, ROLE_TOURNAMENT_ADMIN)) notFound();

  const competitions = await listCompetitions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tournament admin</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage competitions, seasons, and entrants.
        </p>
      </div>

      <CreateCompetitionWizard />

      <Card>
        <CardHeader>
          <CardTitle>All competitions ({competitions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {competitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No competitions yet — create one above.
            </p>
          ) : (
            <ul className="divide-y">
              {competitions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-2">
                    <FormatBadge format={c.format} />
                    <Link
                      href={`/tournaments/${c.slug}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {c.gameMode} · {c.entrantCount} entrants
                    </span>
                  </div>
                  <SeasonStatusBadge status={c.currentSeasonStatus} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
