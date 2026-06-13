import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";

import type { TeamRow } from "@/entities/teams/types";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

export function TeamHeader({ team }: { team: TeamRow }) {
  const showAvatar =
    typeof team.avatar === "string" && team.avatar.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={cn(
            "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg",
          )}
        >
          {showAvatar ? (
            <Image
              src={team.avatar!}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <Users className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{team.name}</h1>
            {team.nickname ? (
              <Badge variant="secondary">{team.nickname}</Badge>
            ) : null}
          </div>
          {team.description ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {team.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="text-muted-foreground text-sm">
        <Link
          href="/teams"
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          ← All teams
        </Link>
      </div>
    </div>
  );
}
