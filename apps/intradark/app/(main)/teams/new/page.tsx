import Link from "next/link";
import { redirect } from "next/navigation";

import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { TeamCreateForm } from "@/entities/teams/components/team-create-form";
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

export default async function CreateTeamPage() {
  const viewer = await getCurrentUserProfiles();
  if (!viewer) {
    redirect(`/auth?returnTo=${encodeURIComponent("/teams/new")}`);
  }

  const steamid64 = viewer.userProfile.steam_profile_id;

  return (
    <MainSectionShell
      title="Create team"
      description="Start a new team workspace. You will be the team leader."
    >
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/teams">← Back to teams</Link>
        </Button>
      </div>

      {!steamid64 ? (
        <Card>
          <CardHeader>
            <CardTitle>Steam required</CardTitle>
            <CardDescription>
              Link your Steam account before creating a team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/auth">Connect Steam</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TeamCreateForm />
      )}
    </MainSectionShell>
  );
}
