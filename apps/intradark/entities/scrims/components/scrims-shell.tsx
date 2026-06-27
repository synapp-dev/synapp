"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Users } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import type { ScrimBootstrap } from "../types";
import { ScrimDataProvider } from "./scrim-data-provider";
import { ScrimTabs } from "./scrim-tabs";
import { ScrimTeamPicker } from "./scrim-team-picker";

export function ScrimsShell({
  bootstrap,
  children,
}: {
  bootstrap: ScrimBootstrap;
  children: ReactNode;
}) {
  const hasTeams = bootstrap.myTeams.length > 0;

  return (
    <ScrimDataProvider bootstrap={bootstrap}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <ScrimTabs />
          {hasTeams ? <ScrimTeamPicker /> : null}
        </div>
        {hasTeams ? (
          children
        ) : (
          <Card className="mx-auto mt-8 max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" /> Join a team to scrim
              </CardTitle>
              <CardDescription>
                Scrims are played team vs team. Create or join a team to post
                availability and challenge other teams.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/teams/new">Create a team</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrimDataProvider>
  );
}
