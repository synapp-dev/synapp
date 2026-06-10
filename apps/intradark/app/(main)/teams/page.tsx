import Link from "next/link";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { teamHomePath } from "@/entities/teams/lib/resolve-team-slug";
import { getMyTeamsForUser } from "@/entities/teams/lib/queries";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const viewer = await getCurrentUserProfiles();
  const steamid64 = viewer?.userProfile.steam_profile_id ?? null;
  const myTeams = steamid64 ? await getMyTeamsForUser(steamid64) : [];

  return (
    <MainSectionShell
      title="Teams"
      description={
        viewer
          ? "Teams you belong to and your team workspaces."
          : "Browse team workspaces. Sign in to create or manage your teams."
      }
    >
      {viewer && steamid64 ? (
        <div className="mb-6">
          <Button asChild>
            <Link href="/teams/new">Create team</Link>
          </Button>
        </div>
      ) : null}

      {!viewer ? (
        <Card>
          <CardHeader>
            <CardTitle>Sign in to see your teams</CardTitle>
            <CardDescription>
              Link your account to create a team or view memberships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/auth?returnTo=${encodeURIComponent("/teams")}`}>
                Sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : !steamid64 ? (
        <Card>
          <CardHeader>
            <CardTitle>Link Steam to create a team</CardTitle>
            <CardDescription>
              Team leadership is tied to your linked Steam profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/auth">Connect Steam</Link>
            </Button>
          </CardContent>
        </Card>
      ) : myTeams.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No teams yet</CardTitle>
            <CardDescription>
              Create your first team to get a shared workspace and roster.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/teams/new">Create team</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {myTeams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>/{team.slug}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild variant="default" size="sm">
                  <Link href={teamHomePath(team.slug)}>Home</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainSectionShell>
  );
}
