import Link from "next/link";
import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

/** Keep in sync with dummy teams in `components/organisms/team-switcher.tsx`. */
const TEAMS = [
  { id: "1", name: "Team Alpha", slug: "team-alpha" },
  { id: "2", name: "Team Beta", slug: "team-beta" },
] as const;

export default function TeamsPage() {
  return (
    <MainSectionShell
      title="Teams"
      description="Browse your teams and open a team workspace."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {TEAMS.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription>Team home and schedule</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="default" size="sm">
                <Link href={`/teams/${team.slug}/home`}>Home</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/teams/${team.slug}/upcoming`}>Upcoming</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainSectionShell>
  );
}
