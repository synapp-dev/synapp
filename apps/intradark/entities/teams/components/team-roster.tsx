import Link from "next/link";

import type { TeamRosterMember } from "@/entities/teams/types";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

function RosterRow({ member }: { member: TeamRosterMember }) {
  return (
    <Link
      href={member.profileHref}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
    >
      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
        {member.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Steam CDN avatar */
          <img
            src={member.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-muted-foreground text-xs">?</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{member.displayName}</span>
          {member.role === "leader" ? (
            <Badge variant="default" className="shrink-0">
              Leader
            </Badge>
          ) : null}
          {member.username ? (
            <Badge variant="outline" className="shrink-0">
              @{member.username}
            </Badge>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function TeamRoster({ members }: { members: TeamRosterMember[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Roster</CardTitle>
        <CardDescription>
          {members.length === 0
            ? "No members yet."
            : `${members.length} member${members.length === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Member invites and role management are coming soon.
          </p>
        ) : (
          members.map((member) => (
            <RosterRow key={member.steamid64} member={member} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
